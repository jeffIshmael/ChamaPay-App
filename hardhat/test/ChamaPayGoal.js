const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ChamaPayGoal", function () {
  let owner, creator, member, treasury, stranger;
  let usdc, mUsdc, goal;

  const parseUsdc = (n) => ethers.parseUnits(String(n), 6);

  // GoalType: Personal=0, Invite=1, Public=2
  // WithdrawMode: All=0, YieldOnly=1, PrincipalOnly=2, Amount=3
  const Type = { Personal: 0, Invite: 1, Public: 2 };
  const Mode = { All: 0, YieldOnly: 1, PrincipalOnly: 2, Amount: 3 };

  beforeEach(async function () {
    [owner, creator, member, treasury, stranger] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const MockMErc20 = await ethers.getContractFactory("MockMErc20");
    mUsdc = await MockMErc20.deploy(await usdc.getAddress());
    await mUsdc.waitForDeployment();

    const ChamaPayGoal = await ethers.getContractFactory("ChamaPayGoal");
    goal = await upgrades.deployProxy(
      ChamaPayGoal,
      [owner.address, await usdc.getAddress(), await mUsdc.getAddress()],
      { kind: "uups" }
    );
    await goal.waitForDeployment();

    for (const user of [creator, member, treasury, stranger]) {
      await usdc.mint(user.address, parseUsdc(100_000));
      await usdc.connect(user).approve(await goal.getAddress(), ethers.MaxUint256);
    }
  });

  it("creates a goal with creator as first member and type", async function () {
    const end = Math.floor(Date.now() / 1000) + 86400 * 30;
    await expect(
      goal.connect(creator).createGoal(parseUsdc(10_000), end, false, Type.Invite)
    ).to.emit(goal, "GoalCreated");

    expect(await goal.totalGoals()).to.equal(1n);
    expect(await goal.isMember(0, creator.address)).to.equal(true);
    const finance = await goal.getGoalFinance(0);
    expect(finance.goalType).to.equal(Type.Invite);
  });

  it("forces yield off for Public even if true is passed", async function () {
    await goal.connect(creator).createGoal(parseUsdc(5_000), 0, true, Type.Public);
    const finance = await goal.getGoalFinance(0);
    expect(finance.yieldEnabled).to.equal(false);
    expect(finance.goalType).to.equal(Type.Public);

    // Contract still allows enabling later (UI hides it for now)
    await goal.connect(member).contribute(0, parseUsdc(20));
    await goal.connect(creator).setYieldEnabled(0, true);
    expect((await goal.getGoalFinance(0)).yieldEnabled).to.equal(true);
  });

  it("allows contribute while idle and tracks principal", async function () {
    await goal.connect(creator).createGoal(parseUsdc(10_000), 0, false, Type.Personal);
    await goal.connect(member).contribute(0, parseUsdc(100));

    const finance = await goal.getGoalFinance(0);
    expect(finance.totalBalance).to.equal(parseUsdc(100));
    expect(finance.idleUsdc).to.equal(parseUsdc(100));
    expect(finance.principalRemaining).to.equal(parseUsdc(100));
    expect(finance.yieldEarned).to.equal(0n);
    expect(finance.yieldEnabled).to.equal(false);
  });

  it("supplies to Moonwell when yield is enabled at create", async function () {
    await goal.connect(creator).createGoal(parseUsdc(10_000), 0, true, Type.Personal);
    await goal.connect(member).contribute(0, parseUsdc(50));

    const finance = await goal.getGoalFinance(0);
    expect(finance.idleUsdc).to.equal(0n);
    expect(finance.moonwellUsdc).to.equal(parseUsdc(50));
    expect(finance.totalBalance).to.equal(parseUsdc(50));
  });

  it("toggles yield off and captures simulated interest", async function () {
    await goal.connect(creator).createGoal(0, 0, true, Type.Invite);
    await goal.connect(member).contribute(0, parseUsdc(100));
    await mUsdc.setExchangeRate(ethers.parseUnits("1.1", 18));

    await goal.connect(creator).setYieldEnabled(0, false);

    const finance = await goal.getGoalFinance(0);
    expect(finance.yieldEnabled).to.equal(false);
    expect(finance.moonwellUsdc).to.equal(0n);
    expect(finance.idleUsdc).to.equal(parseUsdc(110));
    expect(finance.principalRemaining).to.equal(parseUsdc(100));
    expect(finance.yieldEarned).to.equal(parseUsdc(10));
  });

  it("toggles yield on from idle", async function () {
    await goal.connect(creator).createGoal(0, 0, false, Type.Personal);
    await goal.connect(member).contribute(0, parseUsdc(200));
    await goal.connect(creator).setYieldEnabled(0, true);

    const finance = await goal.getGoalFinance(0);
    expect(finance.yieldEnabled).to.equal(true);
    expect(finance.idleUsdc).to.equal(0n);
    expect(finance.moonwellUsdc).to.equal(parseUsdc(200));
  });

  it("withdraw All sends full balance and deactivates", async function () {
    await goal.connect(creator).createGoal(0, 0, false, Type.Personal);
    await goal.connect(stranger).contribute(0, parseUsdc(75));

    await expect(
      goal.connect(member).withdraw(0, 0, Mode.All)
    ).to.be.revertedWith("Not goal creator");

    const before = await usdc.balanceOf(creator.address);
    await goal.connect(creator).withdraw(0, 0, Mode.All);
    const after = await usdc.balanceOf(creator.address);

    expect(after - before).to.equal(parseUsdc(75));
    expect((await goal.getGoalFinance(0)).active).to.equal(false);
  });

  it("withdraw All redeems from Moonwell including yield", async function () {
    await goal.connect(creator).createGoal(0, 0, true, Type.Personal);
    await goal.connect(member).contribute(0, parseUsdc(40));
    await mUsdc.setExchangeRate(ethers.parseUnits("1.25", 18));

    const before = await usdc.balanceOf(creator.address);
    await goal.connect(creator).withdraw(0, 0, Mode.All);
    expect((await usdc.balanceOf(creator.address)) - before).to.equal(parseUsdc(50));
  });

  it("withdraw YieldOnly leaves principal", async function () {
    await goal.connect(creator).createGoal(0, 0, true, Type.Invite);
    await goal.connect(member).contribute(0, parseUsdc(100));
    await mUsdc.setExchangeRate(ethers.parseUnits("1.1", 18));

    const before = await usdc.balanceOf(creator.address);
    await goal.connect(creator).withdraw(0, 0, Mode.YieldOnly);
    expect((await usdc.balanceOf(creator.address)) - before).to.equal(parseUsdc(10));

    const finance = await goal.getGoalFinance(0);
    expect(finance.principalRemaining).to.equal(parseUsdc(100));
    expect(finance.totalBalance).to.equal(parseUsdc(100));
    expect(finance.yieldEarned).to.equal(0n);
    expect(finance.yieldEnabled).to.equal(true);
    expect(finance.moonwellUsdc).to.equal(parseUsdc(100)); // re-supplied
    expect(finance.active).to.equal(true);
  });

  it("withdraw PrincipalOnly leaves yield in the pot", async function () {
    await goal.connect(creator).createGoal(0, 0, true, Type.Invite);
    await goal.connect(member).contribute(0, parseUsdc(100));
    await mUsdc.setExchangeRate(ethers.parseUnits("1.2", 18));

    const before = await usdc.balanceOf(creator.address);
    await goal.connect(creator).withdraw(0, 0, Mode.PrincipalOnly);
    expect((await usdc.balanceOf(creator.address)) - before).to.equal(parseUsdc(100));

    const finance = await goal.getGoalFinance(0);
    expect(finance.principalRemaining).to.equal(0n);
    expect(finance.totalBalance).to.equal(parseUsdc(20));
    expect(finance.yieldEarned).to.equal(parseUsdc(20));
    expect(finance.active).to.equal(true);
  });

  it("withdraw Amount reduces principal first and resupplies leftover", async function () {
    await goal.connect(creator).createGoal(0, 0, true, Type.Invite);
    await goal.connect(member).contribute(0, parseUsdc(100));
    await mUsdc.setExchangeRate(ethers.parseUnits("1.1", 18)); // bal 110, principal 100, yield 10

    const before = await usdc.balanceOf(creator.address);
    await goal.connect(creator).withdraw(0, parseUsdc(40), Mode.Amount);
    expect((await usdc.balanceOf(creator.address)) - before).to.equal(parseUsdc(40));

    const finance = await goal.getGoalFinance(0);
    expect(finance.principalRemaining).to.equal(parseUsdc(60));
    expect(finance.totalBalance).to.equal(parseUsdc(70));
    expect(finance.yieldEarned).to.equal(parseUsdc(10));
    expect(finance.yieldEnabled).to.equal(true);
    expect(finance.moonwellUsdc).to.equal(parseUsdc(70));
  });

  it("maxWithdrawable respects Moonwell cash cap", async function () {
    await goal.connect(creator).createGoal(0, 0, true, Type.Personal);
    await goal.connect(member).contribute(0, parseUsdc(100));

    await mUsdc.setCashCap(true, parseUsdc(30));
    expect(await goal.maxWithdrawable(0)).to.equal(parseUsdc(30));

    await expect(
      goal.connect(creator).withdraw(0, 0, Mode.All)
    ).to.be.revertedWith("Insufficient Moonwell liquidity");

    const before = await usdc.balanceOf(creator.address);
    await goal.connect(creator).withdraw(0, parseUsdc(30), Mode.Amount);
    expect((await usdc.balanceOf(creator.address)) - before).to.equal(parseUsdc(30));
  });

  it("cannot remove member who has contributed", async function () {
    await goal.connect(creator).createGoal(0, 0, false, Type.Invite);
    await goal.connect(creator).addMember(0, member.address);
    await goal.connect(member).contribute(0, parseUsdc(5));

    await expect(
      goal.connect(creator).removeMember(0, member.address)
    ).to.be.revertedWith("Has contributions");
  });

  it("can remove member with zero contributions", async function () {
    await goal.connect(creator).createGoal(0, 0, false, Type.Invite);
    await goal.connect(creator).addMember(0, member.address);
    await goal.connect(creator).removeMember(0, member.address);
    expect(await goal.isMember(0, member.address)).to.equal(false);
  });

  it("contributeFor credits a member; any payer including treasury/stranger", async function () {
    await goal.connect(creator).createGoal(0, 0, false, Type.Invite);
    await goal.connect(creator).addMember(0, member.address);

    // Non-member cannot be the credited contributor
    await expect(
      goal.connect(stranger).contributeFor(0, stranger.address, parseUsdc(10))
    ).to.be.revertedWith("Contributor not a member");

    // Stranger pays for a member from their wallet
    await goal.connect(stranger).contributeFor(0, member.address, parseUsdc(10));
    expect(await goal.contributed(0, member.address)).to.equal(parseUsdc(10));
    expect(await goal.contributed(0, stranger.address)).to.equal(0n);

    // Off-chain treasury (invite pay-link guest) credits a selected member
    await goal.connect(treasury).contributeFor(0, creator.address, parseUsdc(7));
    expect(await goal.contributed(0, creator.address)).to.equal(parseUsdc(7));
    expect((await goal.getGoalFinance(0)).principalRemaining).to.equal(parseUsdc(17));
  });

  it("treasury contribute is guest pot credit on-chain", async function () {
    await goal.connect(creator).createGoal(0, 0, false, Type.Public);
    await goal.connect(treasury).contribute(0, parseUsdc(15));
    // Ledger shows treasury address; app maps treasury → stranger/guest UI
    expect(await goal.contributed(0, treasury.address)).to.equal(parseUsdc(15));
    expect((await goal.getGoalFinance(0)).totalBalance).to.equal(parseUsdc(15));
  });

  it("addMember works for invite circle", async function () {
    await goal.connect(creator).createGoal(0, 0, false, Type.Invite);
    await goal.connect(creator).addMember(0, member.address);
    expect(await goal.isMember(0, member.address)).to.equal(true);
  });

  it("rejects contribute after end date", async function () {
    const latest = await ethers.provider.getBlock("latest");
    const end = latest.timestamp + 10;
    await goal.connect(creator).createGoal(0, end, false, Type.Personal);
    await ethers.provider.send("evm_increaseTime", [20]);
    await ethers.provider.send("evm_mine", []);
    await expect(goal.connect(member).contribute(0, parseUsdc(1))).to.be.revertedWith(
      "Goal ended"
    );
  });
});
