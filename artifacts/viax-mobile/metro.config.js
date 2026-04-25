const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

const defaultWatchFolders = Array.isArray(config.watchFolders) ? config.watchFolders : [];
config.watchFolders = Array.from(new Set([...defaultWatchFolders, projectRoot, workspaceRoot]));

const defaultNodeModulesPaths = Array.isArray(config.resolver.nodeModulesPaths)
  ? config.resolver.nodeModulesPaths
  : [];
config.resolver.nodeModulesPaths = Array.from(
  new Set([
    ...defaultNodeModulesPaths,
    path.resolve(projectRoot, "node_modules"),
    path.resolve(workspaceRoot, "node_modules"),
  ]),
);

config.resolver.disableHierarchicalLookup = true;

module.exports = withNativeWind(config, { input: "./global.css" });
