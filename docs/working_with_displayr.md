There are several noteworthy displayr behaviours to keep in mind when maintaining htmlwidgets for use in [Displayr](https://app.displayr.com).

In no particular order:

## Displayr widget caching
When a widget is calculated in R then we take note of the R output (the widget’s data) and any JS libraries it uses (which we upload to a CDN). This information is stored in the Displayr/Q project, ensuring that the widget’s data is always used with the same JavaScript assets that were current when it was calculated, even if the project is loaded 6 months later.

If the user recalculates a widget in Displayr/Q then new output/data is captured and new assets are remembered and used. Displayr/Q will sees that the JS assets have changed after recalculation and then the widget will be reloaded from scratch into the DOM.

## The statechanged callback

Displayr uses a modified version of the htmlwidgets package that will hand an initial state and a state changed callback to a widget. This allows user interactions with a widget to be persisted.

The new render value signature is as follows:

    renderValue(x, state) <-- state is an object containing user state
     
The new factory signature is as follows:

    factory(el, width, height, stateChangedFn) <-- stateChangedFn is a function reference that the widget should call with the new "state" object every time the user state is updated
    
(the following might change) Every time the statchanged callback is called, Displayr will call renderValue(). make a note of this as it means your widget will redraw every time you call the stateChanged function.

## Extremely verbose Displayr logging

Display logs so many things to console.log the signal to noise ratio is effectively zero. If you need to silence displayr so you can see what your widget is saying, simply run this in the dev tools console:

    suppressDisplayrLogging()
 
## Sizing in Displayr

Displayr set two variables in the R context that communicate the widget size : QOutputSizeWidth and QOutputSizeHeight.

As a general rule, widgets should ignore the initial size that is passed to the factory constructor. This is because Displayr caches the html widget JS+HTML outputs from the first time a widget is computed. These values are reused until a user explicitly runs "calculate". What this means is the widget author must guard against the following scenario (Kyle to reconfirm this is what happens ...):
 
* widget is initially calculated with width 200x100. Assets are cached, these assets contain the initial width and height of 200x100
* user resizes widget several times by drag resizing the container, the htmlwidget wrapper code handles calling the widget resize function. Displayr is not involved in this, but displayr does record the final size of the widget window for later rerednering.
* user views some other pages, or closes the app
* when the user returns to the page with the widget, the cached assets are used, so the widget is passed 200x100 even though the actual container is now no longer 200x100
* this would be corrected if the user hits "calculate" or if the user resizes the box (causing resize to get called).