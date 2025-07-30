// this file has all ser related functions
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// function to get a user
exports.getUser = async (req, res) => {
  try {
    console.log("endpoint caught.")
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    const formattedResponse = { user };
    console.log(user);

    res.status(200).json(formattedResponse);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

