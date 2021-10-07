There are several noteworthy displayr behaviours to keep in mind when maintaining htmlwidgets for use in [Displayr](https://app.displayr.com).

![htmlwidget lifecycle](https://raw.githubusercontent.com/Displayr/rhtmlBuildUtils/master/docs/widget%20life%20cycle.jpg)

In no particular order:

## Displayr widget caching
When a widget is calculated in displayr then the R output (the widget’s data) and references to JS libraries (including the widget wrapper library and the widget code used) are stored in the Displayr project.  The JS libraries themselves are uploaded to a CDN and stored permanently. The next time the widget is displayed, nothing is recomputed, Displayr just serves the JS+HTML assets with the previously computed widget data to the browser for rendering. This is done to ensure that the widgets will be consistently drawn the way it was when the user last viewed the page, even if the project is loaded 6 months later.

If the user recalculates a widget in Displayr/Q then new output/data is captured and new assets are remembered and used. Displayr/Q will sees that the JS assets have changed after recalculation and then the widget will be reloaded from scratch into the DOM.

This has several consequences:

* Even if you update a widget implementation and upload that to the R server, these updates will not be reflected until you click "calculate"
* If the user resizes the widget then closes the browser or navigates, when they eventually return to the page and the widget is drawn, the factory will be called with the original widget dimensions, not the new ones. See "Sizing is Displayr" below for more details.

## The statechanged callback

Displayr uses a modified version of the htmlwidgets package that will hand an initial state and a state changed callback to a widget. This allows user interactions with a widget to be persisted. There are more detailed documentation [here](https://github.com/Displayr/htmlwidgets/blob/master/vignettes/develop_advanced.Rmd#preserving-widget-state). In summary:

The new render value signature is as follows:

    renderValue(x, state) <-- state is an object containing user state
     
The new factory signature is as follows:

    factory(el, width, height, stateChangedFn) <-- stateChangedFn is a function reference that the widget should call with the new "state" object every time the user state is updated
    
(the following might change) **Every time the statchanged callback is called, Displayr will call renderValue().** Make a note of this as it means your widget will redraw every time you call the stateChanged function.

## Extremely verbose Displayr logging

Displayr logs so many things to console.log the signal to noise ratio with respect to widget logging is effectively zero. If you need to silence displayr so you can see what your widget is saying, simply run this in the dev tools console:

    suppressDisplayrLogging()
 
## Sizing in Displayr

In general the _R_ code does not need to know the available display area; it is the _JavaScript_ code's job to work out how the data will fit into the ifrane.  However to provide for the rare case where the data being visualised depends on the output area, Displayr sets two variables in the R context that communicate the initial widget size: QOutputSizeWidth and QOutputSizeHeight.  These measurements are in inches. 

If you do decide to use these measurements then be aware that the R code will not be automatically rerun when the widget is resized, and thus the widget will need to be able to fit the original data into whatever space it finds in the DOM.

I think that the below stems from a misunderstanding: that the widget should include the size provided to R in the data given to JavaScript.  This has the disadvantages described below.  Instead a widget should always get its size from the DOM.

As a general rule, widgets should ignore the initial size that is passed to the factory constructor. This is because Displayr caches the html widget JS+HTML outputs from the first time a widget is computed. These values are reused until a user explicitly runs "calculate". What this means is the widget author must guard against the following scenario (Kyle to reconfirm this is what happens ...):
 
* widget is initially calculated with width 200x100. Assets are cached, these assets contain the initial width and height of 200x100
* user resizes widget several times by drag resizing the container, the htmlwidget wrapper code handles calling the widget resize function. Displayr is not involved in this, but displayr does record the final size of the widget window for later rerendering.
* user views some other pages, or closes the app
* when the user returns to the page with the widget, the cached assets are used, so the widget is passed 200x100 even though the actual container is now no longer 200x100
* this would be corrected if the user hits "calculate" or if the user resizes the box (causing resize to get called).

## Testing widgets in Displayr

Displayr can be configured to use a dev R server. So to test a widget in Displayr you must install the widget on the dev server and then change your displayr session to use the dev R server. 

Specific steps are listed below (assuming a widget called Displayr/rhtmlFoo and a working branch of JIRA-1234):

* build the inst directory of the widget and commit and push your code (`gulp; git commit -m 'message'; git push origin head`)   
* login to the dev server (get server username and location from Displayr team)
* Run `R_opencpu` and enter the following command sequence, then exit R_opencpu
```
    library(devtools)
    install_github("Displayr/rhtmlFoo@JIRA-1234")
    quit() 

```
* Run `update_opencpu.sh`

It is important to note the widget CDN caching behaviour, see the `Displayr widget caching` section above. TLDR; after the 4 steps above, you must still click 'calculate' to use your new code.

**Productivity Enhancement**

On osx/unix/linux you can add this to your bash_profile (assuming you have your public key installed in the authorized_keys list for the dev server):
 
    function numpush () {
        ssh -o "StrictHostKeyChecking=no" <DEV_SERVER_USERNAME>@<DEV_SERVER_HOSTNAME> 'echo library\(devtools\)\; install_github\(\"'$1'\"\)\; quit\(\) > /tmp/foo; /home/numbers/bin/R_opencpu --file=/tmp/foo; /home/numbers/bin/update_opencpu.sh'
    } 

Then the whole process becomes (assuming a widget called Displayr/rhtmlFoo and a working branch of JIRA-1234):

    $ gulp #<-- build the widget
    $ git commit -m 'message' && git push origin head <-- push code to git
    $ numpush "Displayr/rhtmlFoo@JIRA-1234" <-- push code to R Server

**Widget status attribute**

Widgets should be adding the attribute `rhtmlwidget-status` with the value `loading` to their root element div when they are first added to the document, and then setting the value to `ready` once the widget has finished drawing. This is so that Displayr can determine when a widget is ready to be snapshotted when testing.
