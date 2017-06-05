module.exports = function(projectConfig) {
  return {
    tasks: {
      buildContentManifest: require('./build/tasks/buildContentManifest')(projectConfig)
    }
  };
}
