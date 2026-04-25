const path = require("path");
const Module = require("module");

const projectNodeModules = path.resolve(__dirname, "node_modules");
process.env.NODE_PATH = process.env.NODE_PATH
  ? `${projectNodeModules}${path.delimiter}${process.env.NODE_PATH}`
  : projectNodeModules;
Module._initPaths();

const originalResolveLookupPaths = Module._resolveLookupPaths;
Module._resolveLookupPaths = function patchedResolveLookupPaths(request, parent) {
  const result = originalResolveLookupPaths.call(this, request, parent);
  if (Array.isArray(result) && !result.includes(projectNodeModules)) {
    result.push(projectNodeModules);
  }
  return result;
};

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

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
