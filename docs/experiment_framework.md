*WIP NOTES*

TODO Intent of the framework

TODO Examples of the framework

# Quick Refererence

* run an experiment: `gulp runExperiment --name EXPERIMENT_NAME`
* skip the baseline: `gulp runExperiment --no-baseline --name EXPERIMENT_NAME` 
* run only a specific iteration of an experiment: `gulp runExperiment --iteration ITERATION_NAME --no-baseline --name EXPERIMENT_NAME`

# Required Files and Config

TODO 

# Important

In the `testplan.yaml`

Do not forget to add config.experiment_variable_config to the beginning of each config line. It would be great if this was not necessary, but at present, it is. This has caught me each time I run an experiment. It will catch you too. If you dont add this, then there is no variation between the different iterations of the experiment because you are not actually applying your overrides