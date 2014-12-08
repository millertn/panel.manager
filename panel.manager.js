define(['jquery', 'knockout'], function ($, ko) {

    var activeWeights = ko.observable(0),
		inactiveTabHeights = ko.observable(0),
		activeTabs = ko.observable(0),
		pfx = ["webkit", "moz", "MS", "o", ""],
		options = {
			defaultHeaderHeight: undefined,//string (value with measurement, ex: 50px, 50em, 50%...)
			toggleZone: undefined, //string/function
	    	allowCloseAll: undefined, //true/false
	    	afterResizeComplete: undefined, //function
	    	beforeResize: undefined, //function
	    	panels: undefined,//array
		},
		vac = {};//valueAccessor

    function PrefixedEvent(element, type, callback) {
        for (var p = 0; p < pfx.length; p++) {
            if (!pfx[p]) {
                type = type.toLowerCase();
            }
            $(element).on(pfx[p] + type, callback);
        }
    }

    function calculateHeights(arrayOfSections, $selectedHeader) {
        if (!$selectedHeader) {
            throw ("Multi-Accordion -> calculateHeights: No selected header defined");
        }

        var $selectedTab = $selectedHeader.parent(),
			$selectedTc = $selectedTab.children("[data-accordion='content']"),
			$selectedTh = $selectedTab.children("[data-accordion='header']"),
			selectedTcVisible = !($selectedTab.height() <= $selectedTh.height()),
			$t = null,
			$tc = null,
			$th = null,
			$tcVisible = null;


        //Reset variables
        activeTabs(0),
		inactiveTabHeights(0),
		activeWeights(0);

        //Sum active weights and inactive tab header height (taking into account selected tab which does not have values applied yet --this enables some smoother css transitions--)
        for (var i = 0; i < arrayOfSections.length; i++) {
            $t = $(arrayOfSections[i]);
            $tc = $t.children("[data-accordion='content']");
            $th = $t.children("[data-accordion='header']");
            tcVisible = !($t.height() <= $th.height());

            if (tcVisible && $selectedTab[0] !== $t[0]) {

                activeWeights(activeWeights() + $t.data("weight")); //Add to sum of active weights
                activeTabs(activeTabs() + 1);

            } else if ($selectedTab[0] === $t[0]) { //Check to see if selected tab is going to be hidden or visible

                if (tcVisible) { //then will be inactive (
                    inactiveTabHeights(inactiveTabHeights() + $th.height());
                } else { //it will become active
                    activeWeights(activeWeights() + $t.data("weight")); //Add to sum of active weights
                    activeTabs(activeTabs() + 1);
                }
            } else { //The tab is hidden, so it is inactive			
                inactiveTabHeights(inactiveTabHeights() + $th.height());
            }
        }



        //Set heights (will move to knockout binding to be dynamic) for ACTIVE tabs
        //If expanding tab, then set heights from top down (heights will be collapsing)
        //Else if collapsing tab, set heights from bottom top (heights will be increasing)
        if (selectedTcVisible) {  //Content of tab is visible, thus it it will become invisible, and we are collapsing (bottom up)			
            for (var x = arrayOfSections.length - 1; x >= 0; x--) {
                setHeight(arrayOfSections[x], $selectedTab);
            }
        } else {//Content of tab is not visible, thus it will be visible, and we are expanding (top down)
            for (var p = 0; p < arrayOfSections.length; p++) {
                setHeight(arrayOfSections[p], $selectedTab);
            }
        }

    }

    function setHeight(tab, $selectedTab) {
        var $t = $(tab),
			$tc = $t.children("[data-accordion='content']"),
			$th = $t.children("[data-accordion='header']"),
			tcVisible = !($t.height() <= $th.height()),
			tabPercentage = 0,
			tabHeight = 0;

        if (tcVisible && $selectedTab[0] !== $t[0]) { //Tab isn't selected tab and is visible, which means it just needs to be resized
            tabPercentage = (($t.data("weight") / activeWeights()) * 100).toFixed(1);

            if (activeTabs() === 0) {//Can't divide by 0, set height to header height
                tabHeight = $th.height();
            } else {
                tabHeight = parseFloat((inactiveTabHeights() / activeTabs()).toFixed(2));
            }

            animateHeight({
                $tab: $t,
                tabPercentage: tabPercentage,
                tabHeight: tabHeight,
                speed: 500
            });

        } else if ($selectedTab[0] === $t[0]) {// Tab is selected tab, thus needs to either hide, or show with appropriate size
            tabPercentage = (($t.data("weight") / activeWeights()) * 100).toFixed(1);

            if (activeTabs() === 0) {//Can't divide by 0, set height to header height
                tabHeight = $th.height();
            } else {
                tabHeight = parseFloat((inactiveTabHeights() / activeTabs()).toFixed(2));
            }

            if (tcVisible) { //If tab is visible, then we're toggling to hide, else toggling to show.

                animateHeight({
                    $tab: $t,
                    speed: 500
                });

                //PrefixedEvent($t[0], "TransitionEnd", function(transitionEvent){});

            } else {

                animateHeight({
                    $tab: $t,
                    tabPercentage: tabPercentage,
                    tabHeight: tabHeight,
                    speed: 500
                });

                //PrefixedEvent($t[0], "TransitionEnd", function(transitionEvent){});

            }

        } else if (!(tcVisible) && $selectedTab[0] !== $t[0]) { //The tab is hidden and not the selected tab, so it is inactive
            animateHeight({
                $tab: $t,
                speed: 500
            });
        }
    }

    function animateHeight(options) {
        var $tab = options.$tab || null,
			tabPercentage = options.tabPercentage || null,
			tabHeight = options.tabHeight || null,
			speed = options.speed || null;


        var calcHeight = $tab.children("[data-accordion='header']").height();

        if (tabPercentage && tabHeight) {
            calcHeight = "calc(" + tabPercentage + "% - " + tabHeight + "px)";
        } else if (tabPercentage && !tabHeight) {
            calcHeight = tabPercentage + "%";
        } else if (tabHeight && !tabHeight) {
            calcHeight = tabHeight + "px";
        }

        if (!speed) {
            speed = 500;
        }

        if (vac.beforeResize && typeof vac.beforeResize === "function") {
            vac.beforeResize($tab[0]);
        }

        $tab.css("height", calcHeight);
    }

    function isTabLastToClose($accordion, $tabH) {
        var isTabClosing = $tabH.parent().height() !== $tabH.height(), //If tab is not the same size as header (and it was the one selected), then it is going to close
			isLastTab = true;

        $accordion.children().each(function (i, x) {
            var $ah = $(x).children("[data-accordion='header']");

            if ($ah[0] !== $tabH[0] && $(x).height() !== $ah.height()) { //If the tab is not the one in question, and the tab is not hidden
                isLastTab = false;
            }
        });

        return isLastTab && isTabClosing;

    }

    //Including browser sniffing to fix issue where IE does not work with css transitions when css calc is used
    function isIE() {
        var rv = -1;
        if (navigator.appName == 'Microsoft Internet Explorer') {
            var ua = navigator.userAgent;
            var re = new RegExp("MSIE ([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null) {
                rv = parseFloat(RegExp.$1);
            }
        }
        else if (navigator.appName == 'Netscape') {
            var ua = navigator.userAgent;
            var re = new RegExp("Trident/.*rv:([0-9]{1,}[\.0-9]{0,})");
            if (re.exec(ua) != null) {
                rv = parseFloat(RegExp.$1);
            }
        }
        return rv;
    }

    ko.bindingHandlers.advAccordion = {
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            // This will be called when the binding is first applied to an element
            // Set up any initial state, event handlers, etc. here
            vac = valueAccessor();

            options.defaultHeaderHeight = ko.unwrap(vac.defaultHeaderHeight),
				toggleZone = ko.unwrap(vac.toggleZone),
				allowCloseAll = ko.unwrap(vac.allowCloseAll);

            //Register click events on headers to reveal content 
            $(element).find("[data-accordion='header']").each(function (i, e) {
                var $toggleElement = $(e), //default: toggle element is header
					selElChildren;

                if (typeof toggleZone === "string") {
                    selElChildren = $(e).find(toggleZone); //Check to see if there are any children to the header element that match the string selecter
                    if (selElChildren.length > 0) {
                        $toggleElement = selElChildren;
                    }
                } else if (typeof toggleZone === "function") {
                    selElChildren = toggleZone(e);
                    if ((selElChildren && selElChildren.length > 0)) {
                        $toggleElement = selElChildren;
                    }
                } //Else leave as default (header) 

                $toggleElement.on("click", function (ev) {
                    if (!allowCloseAll && isTabLastToClose($(element), $(e))) { //Find the default tab and select that to be the only one open	
                        var $dth = $(element).children("[data-accordion='default-tab']").children("[data-accordion='header']"),
							loopingTransTime = 0,
							maxTransTime = 0, //Kinda hacky way of ensuring last step of transition doesn't take place until previous transitions finish
							transitionCSS = "";

                        if ($(e)[0] !== $dth[0]) {//If toggleElement (which is the trigger for the header) is not the default tab, then show default only	
                            //Hide all tabs (then calculate height for default tab). Note: transition will take effect for the closing tab, but won't do anything with currently closed tabs

                            for (var p = 0; p < pfx.length; p++) {//loop through the possible prefixed transitions
                                transitionCSS = $(e).parent().css((pfx[p] ? "-" + pfx[p] + "-" : pfx[p]) + "transition");
                                if (transitionCSS) {
                                    loopingTransTime = parseFloat(transitionCSS.match(/((\d+)(\.))?(\d)+s/g)[0]); //getting first match because the first number should be the duration
                                    if (loopingTransTime > maxTransTime) {
                                        maxTransTime = loopingTransTime;
                                    }
                                }
                            }

                            $(e).parent().height($(e).height());
                            setTimeout(function () {
                                calculateHeights($(element).children(), $dth); //recalculate the heights
                            }, maxTransTime * 1000 + 100);

                        } //else default tab is last open, and we won't close it		

                    } else { //Default action
                        calculateHeights($(element).children(), $(e)); //recalculate the heights
                    }
                    if (isIE() > -1) {
                        setTimeout(function () {
                            if (vac.afterResizeComplete && typeof vac.afterResizeComplete === "function") {
                                vac.afterResizeComplete(null, $(e).parent()[0]);
                            }
                        }, maxTransTime * 1000 + 100);
                    }
                   
                });
            });

            $(element).addClass("no-transition"); //Prevent initial transitions
            $(element).children().each(function (i, e) { //Set initial heights and listeners for transition ends	
                //console.log(e);
                $(e).on("TransitionEnd", function (ev) { console.log(ev) });

                if (isIE() === -1) { //IE does not have transitions with calc, so manually wait for time to end inside toggleElement click event                 
                    //listen to transition end
                    PrefixedEvent(e, "TransitionEnd", function (transitionEvent) {
                        //console.log("TransitionEnd");
                        //console.log("IE Transition Hack still in place. Not listening to event, but waiting for max transition time to end.")
                        if (vac.afterResizeComplete && typeof vac.afterResizeComplete === "function") {
                            vac.afterResizeComplete(transitionEvent, transitionEvent.currentTarget);
                        }
                    });
                }                

                $(e).data("accordionID", i);
                $(e).height(headerHeight);
                $(e).children("[data-accordion='header']").height(headerHeight);
                $(e).children("[data-accordion='content']").height("calc(100% - " + headerHeight + ")");

            });

            //On initial load, resize heights with first one to be active
            calculateHeights($(element).children(), $(element).children("[data-accordion='default-tab']").first().children("[data-accordion='header']").first()); //Passing all the accordion sections and the first accordion section
            $(element).removeClass("no-transition");
        },
        update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            // This will be called once when the binding is first applied to an element,
            // and again whenever any observables/computeds that are accessed change
            // Update the DOM element based on the supplied values here.
            //console.log("bar");
        }
    };
});
