define(['knockout'], function (ko) {

    var activePanels = ko.observableArray(),
    	activeWeights = ko.computed(function(){
	    	var aw = 0;
	    	for (var i = 0; i < activePanels().length; i++){
		    	aw += ko.unwrap(activePanels()[i].panelOptions.weight);
	    	}	
	    	return aw;
	    }),
    	
    	inactivePanels = ko.observableArray(),
		inactivePanelHeights = ko.computed(function(){
			var ipheight = 0;
	    	for (var i = 0; i < inactivePanels().length; i++){
		    	ipheight += parseInt(ko.unwrap(inactivePanels()[i].panelOptions.minHeight));
	    	}	
	    	return ipheight;
		}),		
				
		pfx = ["webkit", "moz", "o", ""],
		options = {
	    	allowCloseAll: undefined, //true/false
	    	transitionSpeed: 0,
	     	panels: undefined, //array
		},
		bindingRootElement;

    function PrefixedEvent(element, type, callback) {
		for (var p = 0; p < pfx.length; p++) {
            if (!pfx[p]) {
                type = type.toLowerCase();
            }
            //$(bindingRootElement).on(pfx[p] + type, $(element), callback);    
            element.addEventListener(pfx[p] + type, callback);            
        }
    }

	/*
		Calculate heights based on the "active" "inactive" states of each panel.
		Each panel requests a height, and gives the manager it's minimum height ("minHeight"), weight ("weight"), and active height ("height").
		If a panels min-height matches its active height, then we count that panel as inactive, and we won't perform calculations for that panel.
		Panel manager will loop through all panels and:
			- Sum inactive panel heights. This will allow us to figure the height we have available for allocating to active panels.
			- Determine inactive and active panels
			- If active panels don't exist, then check if allowCloseAll property is set to true. If true, then panels are in a valid state. 
				If false, then determine which panel has the panelDefault property set to true, and make that panel active. 
				If allowCloseAll property is true, but no panels have panelDefault set to true, then first panel will be set to default and become active
		
		
	*/
    function calculateHeights(panels){			
		var panel,
			panelHeight,
			panelMinHeight,
			defaultPanels = [];

        //Reset global (binding based) variables
		inactivePanels.removeAll();
		activePanels.removeAll();

        //Find active, inactive, and default panels, and place in appropriate arrays
        for (var i = 0; i < panels.length; i++) {
            panel = panels[i],
            panelHeight = ko.unwrap(panel.panelOptions.height),
            panelMinHeight = ko.unwrap(panel.panelOptions.minHeight);
            
       	    //If minimum height of panel matches that active height of panel, then the panel is inactive, else it is active. If panel is not collapsible, then panel is always active
            if((panel.panelOptions.active && ko.unwrap(panel.panelOptions.active) === true) || panel.panelOptions.collapsible === false){
	            activePanels.push(panel);
	        } else if ((panel.panelOptions.active && ko.unwrap(panel.panelOptions.active) === false) || (panelHeight === panelMinHeight && panel.panelOptions.collapsible)){
	            inactivePanels.push(panel);
            } else { //default case, however this shouldn't hit. Leaving for testing
	            //console.log("TESTING CASE SHOULDN'T HIT");
	            activePanels.push(panel);
            }     
            
                        
            if (panel.panelOptions.panelDefault === true){
	           defaultPanels.push(panel); 
            }       
        }

		//If there are no active panels, determine if we are allowed to close all panels. If true, then if no panels are active, we are in a valid state even if no panels are active. 
		//	If false, then determine a panel to set as active if none exist
		if (ko.unwrap(options.allowCloseAll) === false && activePanels().length === 0){
			if (defaultPanels.length > 0){ //Add default panels to active panels	
				//Move the default panels to the active panels array, and set their property to active					
				activePanels(activePanels().concat(inactivePanels.removeAll(defaultPanels)));
				ko.utils.arrayForEach(activePanels(), function(panel){
					if(ko.isObservable(panel.panelOptions.active)) {
						panel.panelOptions.active(true);	
					} else if (panel.panelOptions.active){
						panel.panelOptions.active = true;
					}
				});
			} else { //Get first inactive panel and add to active panels. Subtract the height from the removed panel from the inactive panel heights
				activePanels.push(inactivePanels.shift());
				
			}
		} 
			
		//If we have any active panels, then calculate the heights for the active panels. 
		if(activePanels()){
			for (var i = 0; i < activePanels().length; i++){
				panel = activePanels()[i];
				panelHeight = panel.panelOptions.height;
				panelMinHeight = panel.panelOptions.minHeight; 
				
				//If beforeResize callback exists, perform function
				if (panel.panelOptions.beforeResize && typeof panel.panelOptions.beforeResize === "function") {
		            panel.panelOptions.beforeResize(panel._panelView);
		        }
		        
		        //If browser is IE (IE has problems with transitions and events), then simulate the afterResizeComplete callback (if it exists)
				if (isIE() > -1) {

				    setTimeout((function (p) {
				        return function () {
				            if (p.panelOptions.afterResizeComplete && typeof p.panelOptions.afterResizeComplete === "function") {
				                p.panelOptions.afterResizeComplete(null, p._panelView[0]);
				            }
				        }
				    })(panel),
                    (panel.panelOptions.transitionSpeed || options.transitionSpeed) * 1000 + 100);
                    				  
                }	        
                
		        panelHeight("calc("+((ko.unwrap(panel.panelOptions.weight) / activeWeights()) * 100).toFixed(1)+"% - "+inactivePanelHeights()/activePanels().length+"px)");	        
		        
			}
		}	
		
		//Set inactive panels to their minHeight
		for (var i = 0; i < inactivePanels().length; i++){
				panel = inactivePanels()[i];
				panelHeight = panel.panelOptions.height;
				panelMinHeight = panel.panelOptions.minHeight; 
				
				//Only perform computation if needed
				if (panelMinHeight() !== panelHeight()){	
					//If beforeResize callback exists, perform function
					if (panel.panelOptions.beforeResize && typeof panel.panelOptions.beforeResize === "function") {
		                panel.panelOptions.beforeResize(panel._panelView);
		            }
			        
			        //If browser is IE (IE has problems with transitions and events), then simulate the afterResizeComplete callback (if it exists)
			        if (isIE() > -1) {
			            setTimeout((function (p) {
			                return function () {
			                    if (p.panelOptions.afterResizeComplete && typeof p.panelOptions.afterResizeComplete === "function") {
			                        p.panelOptions.afterResizeComplete(null, p._panelView[0]);
			                    }
			                }
			            })(panel),
                        (panel.panelOptions.transitionSpeed || options.transitionSpeed) * 1000 + 100);

                    }
	
			        panelHeight(panel.panelOptions.minHeight());	        
		        }
			}


    }
         
    //Forms a CSS compatible string for setting up a transition
    function formCSSTransition(transitionOptions){
	    var property, duration, timingFunction, delay;
	    if(transitionOptions){
		    property = (transitionOptions.property && transitionOptions.property.length > 0 ? transitionOptions.property: null);
		    duration = (transitionOptions.duration && transitionOptions.duration.length > 0 ? transitionOptions.duration: null);
		    timingFunction = (transitionOptions.timingFunction && transitionOptions.timingFunction.length > 0 ? transitionOptions.timingFunction : null);
		    delay = (transitionOptions.delay && transitionOptions.delay.length > 0 ? transitionOptions.delay: null);
		    
		    return property + " " + duration + " " + timingFunction + " " + delay;
	    }
	    return;
    }

    //Including browser sniffing to fix issue where IE does not work with css transitions when css calc is used
    function isIE() {
        var rv = -1,
            ua = navigator.userAgent;
        if (navigator.appName == 'Microsoft Internet Explorer') {
            var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null) {
                rv = parseFloat(RegExp.$1);
            }
        }
        else if (navigator.appName == 'Netscape') {
            var re = new RegExp("(Trident/.*rv:|Edge\/)([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null) {
                rv = parseFloat(RegExp.$2);
            }
        }
        return rv;
    }

    ko.bindingHandlers.panelManager = {
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            var vac = valueAccessor(),
            	panelViews = [],
            	$panel,
            	panelOptions;

			bindingRootElement = element;
            options.panels = ko.unwrap(vac.options.panels) || [],
            options.transitionSpeed = vac.options.transitionSpeed || 0,
			options.allowCloseAll = vac.options.allowCloseAll;
			
			//Create panel DOM elements and bind to the proper view models
			for(var i = 0; i < options.panels.length; i++){
				let newElement = document.createElement('div');
				newElement.innerHTML =  options.panels[i].panelOptions.view;
				options.panels[i]._panelView = newElement; //Create the panel DOM object
				panelOptions = options.panels[i].panelOptions;
				ko.applyBindingsToNode(options.panels[i]._panelView, {
					style: {
						height: panelOptions.height, 
						transition: formCSSTransition(panelOptions.transitionOptions)
					}
				}, options.panels[i]);	//Apply bindings to the new DOM object
				
				ko.applyBindingsToDescendants(options.panels[i], options.panels[i]._panelView);//Set context/bindings for descendents

				panelViews.push(options.panels[i]._panelView); //Push the created panel into the array of panels
				
				
				//Register prefixed based event for transition end
                PrefixedEvent(options.panels[i]._panelView, "TransitionEnd", function (transitionEvent) {
	                transitionEvent.stopPropagation();
	                var panel = ko.dataFor(transitionEvent.target);
                    if (panel.panelOptions.afterResizeComplete && typeof panel.panelOptions.afterResizeComplete === "function") {
                        panel.panelOptions.afterResizeComplete(transitionEvent, panel._panelView);
                    }                  
                });

				//If the active property has changed, then trigger a recalculation of heights
				if (panelOptions.active && ko.isObservable(panelOptions.active)) {
					panelOptions.active.subscribe(function triggerHeightCalculation(newVal){
						//console.log("triggering height calculation");
						calculateHeights(options.panels);
					});
				}
				panelOptions.minHeight.subscribe(function triggerHeightCalculation(newVal) {
				    calculateHeights(options.panels);
				});
				panelOptions.height.subscribe(function triggerHeightCalculation(newVal) {
				    calculateHeights(options.panels);
				});
			}
			
			//Calculate the heights of the panels
			calculateHeights(options.panels);
			
			//TODO: Create bulk flag. If bulk, make a single call to add all the panels to the DOM
			//$(element).append(panelViews);	
			for(var i = 0; i < options.panels.length; i++){
				element.append(options.panels[i]._panelView);
				if (options.panels[i].compositionComplete && typeof options.panels[i].compositionComplete === "function"){
					options.panels[i].compositionComplete();
				}
				
			}
			
					
           
            return {controlsDescendantBindings: true};
        },
        update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            // This will be called once when the binding is first applied to an element,
            // and again whenever any observables/computeds that are accessed change
            // Update the DOM element based on the supplied values here.
            //console.log("update");
        }
    };
});