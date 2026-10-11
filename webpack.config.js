const path = require('path');
const fs = require('fs');

// Resolve the real path of the current file
const realPath = fs.realpathSync(__dirname);

const defaultConfig = require(
  require.resolve('@wordpress/scripts/config/webpack.config', {
    paths: [realPath],
  })
);

const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const ZENCOMMUNITY_VERSION = '3.0.2';

const sharedAlias = {
  ...defaultConfig.resolve.alias,
  '@Components': path.resolve(__dirname, 'dev_zencommunity/Components'),
  '@Pages': path.resolve(__dirname, 'dev_zencommunity/Pages/'),
  '@Redux': path.resolve(__dirname, 'dev_zencommunity/redux/'),
  '@Utils': path.resolve(__dirname, 'dev_zencommunity/utils/'),
  '@Hooks': path.resolve(__dirname, 'dev_zencommunity/hooks/'),
  '@Context': path.resolve(__dirname, 'dev_zencommunity/context/'),
};

// Main admin/app bundles — keep WordPress externals (react, wp.*) via the
// DependencyExtractionWebpackPlugin baked into the default config.
const mainConfig = {
  ...defaultConfig,
  entry: {
    app: path.resolve(__dirname, 'dev_zencommunity/app.js'),
    settings: path.resolve(__dirname, 'dev_zencommunity/Admin/settings.js'),
    'setup-wizard': path.resolve(__dirname, 'dev_zencommunity/Admin/SetupWizardApp.js'),
    'fse-editor': path.resolve(__dirname, 'dev_zencommunity/fse/editor/index.js'),
  },
  output: {
    path: path.resolve(__dirname, 'assets/build'),
    filename: () => `[name].${ZENCOMMUNITY_VERSION}.js`,
  },
  plugins: [...defaultConfig.plugins, new CleanWebpackPlugin()],
  resolve: {
    alias: sharedAlias,
  },
};

module.exports = mainConfig;
