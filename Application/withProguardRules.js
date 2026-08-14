const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withProguardRules = (config, customRules) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
      let contents = '';
      try {
        contents = fs.readFileSync(file, 'utf8');
      } catch (e) {
        // file doesn't exist, will be created
      }
      if (!contents.includes(customRules)) {
        contents += '\n' + customRules + '\n';
        fs.writeFileSync(file, contents);
      }
      return config;
    },
  ]);
};

module.exports = withProguardRules;
