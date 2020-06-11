//POLYFILL
if (Element.prototype.getAttributeNames == undefined) {
  Element.prototype.getAttributeNames = function () {
    var attributes = this.attributes;
    var length = attributes.length;
    var result = new Array(length);
    for (var i = 0; i < length; i++) {
      result[i] = attributes[i].name;
    }
    return result;
  };
}


//FRIGG
var FRIGG = {};

FRIGG.Client = function (config){

    this.pausableElements = [];

    this.currentVariables = {};
    this.currentLocation = {
        'status': 'disabled',
        'latitude': 0,
        'longitude': 0,
        'timestamp': 0
    };
    this.project = {};

    this.sceneElementHistory = [];
    this.sceneIdHistory = [];
    this.currentSceneElement = null;

    this.forcedInitialScene = null;

    this.params = {
        'projectUrlPrefix': "https://admin.systeme-frigg.org/api/project/",
        'mediaFilePrefix': 'https://admin.systeme-frigg.org/storage/',
        'templatePrefix' : "tpl_",
        'containerElement' : document.getElementById("friggContainer"),
        'templateElement' : document.getElementById("friggTemplates"),
        'debuggerElement' : document.getElementById("friggDebugger"),

        'slotHandler' : {

            'frigg-slot-html' : function(element, data) {
                if (data.valueToBind == null) {
                    element.classList.add("empty");
                    return;
                }

                element.innerHTML = frigg.betterText(data.valueToBind.content);
            },
            'frigg-slot-bg' : function(element, data) {
                if (data.valueToBind == null) {
                    return;
                }

                element.classList.add("with-slot-bg");
                element.style.backgroundImage = "url(" + this.params.mediaFilePrefix + data.valueToBind.content + ")";
            },
            'frigg-slot-class' : function(element, data) {

                if (data.valueToBind == null) {
                    return;
                }

                var newClasses = data.valueToBind.content.split(' ');
                for(var className in newClasses) {
                    element.classList.add(newClasses[className]);
                }
            },


            'frigg-slot-srcAlt' : function(element, data) {
                if (data.valueToBind == null) {
                    element.classList.add("empty");
                    return;
                }

                var src = data.valueToBind.content;
                if (! src.startsWith("http")) {
                    src = this.params.mediaFilePrefix + src;
                }

                element.setAttribute("src", src);
                element.setAttribute("alt", data.valueToBind.description);

                //media elements (audio or video)
                if (element.pause) {
                    this.pausableElements.push(element);
                    this._mediaEventToClass(element, element);
                    this._mediaEventToClass(element, data.sceneElement);

                    var type = this._ucFirstConcat(element.tagName, "autoPlay");
                    if (this.hasCustomData( type )) {
                        element.play();  
                    }
                }
            },

            'frigg-slot-data' : function(element, data) {
                if (data.valueToBind == null) {
                    return;
                }

                var data = data.valueToBind.content;
                
                element.setAttribute("frigg-data", data);
            },


            'frigg-slot-link' : function(element, data) {
                if (data.valueToBind == null) {
                    return;
                }

                var className = this.getClassForLinkSlot(data.valueToBind);

                element.classList.add("link");
                element.classList.add(className);

                element.addEventListener("click", function(event){
                    event.preventDefault();

                    if (data.valueToBind.destination_scene_id) {
                        return this.gotoScene(data.valueToBind.destination_scene_id);
                    }

                    if (data.valueToBind.command == "first") {
                        return this.firstScene();
                    }

                    if (data.valueToBind.command == "back") {
                        return this.previousScene();
                    }

                    
                }.bind(this))
            },
        }, 

        'onMediaPlayed' : function(scene){

        },

        'onProjectLoaded' : function(project){

        },

        'onSceneLoaded' : function(scene, project){

        },

        'onSceneBinded' : function(scene, project){

        },

        'onVariableChanged' : function(project, scene, variableName, variableValue){

        },

        'onTemplateLoaded' : {
            
        },

        'onPausableBinded' : function(parentElement, sceneData, pausableElements, frigg){
            var playElements = parentElement.querySelectorAll("[frigg-media-control]");
            var media = pausableElements[0];

            var playPause = function() {
                if (media.paused) {
                    frigg.params.onMediaPlayed(sceneData, frigg.project);

                    media.play();
                    frigg.applyClassBySelector(parentElement, "[frigg-event-media-paused]", "disabled", 'add');
                    frigg.applyClassBySelector(parentElement, "[frigg-event-media-started]", "disabled", 'remove');
                } else {
                    media.pause();
                    frigg.applyClassBySelector(parentElement, "[frigg-event-media-paused]", "disabled", 'remove');
                    frigg.applyClassBySelector(parentElement, "[frigg-event-media-started]", "disabled", 'add');
                }
            }.bind(this);

            for (var i = 0; i < playElements.length; i++) {
                playElements[i].addEventListener("click", playPause);
            }

            //initial
            frigg.applyClassBySelector(parentElement, "[frigg-event-media-started]", "disabled", 'add');

        },
    };

    this.allAttributes = [];

    this._getLocalStorageKey = function(project, category){
        var key = 'frigg_project_' + project.project_id + "_" + category;
        return key;
    }


    this._saveHistoryToLocalStorage = function(project, scene) {
        var key = this._getLocalStorageKey(project, "history");
        var existing = this._getFromLocalStorage(project, "history", []);

        existing.push(scene.id);
        localStorage.setItem(key, JSON.stringify(existing));
    }

    this._ucFirstConcat = function(string, prefix) {
        return prefix + string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
    } 

    this._saveVariableToLocalStorage = function(project, variableName, value) {
        var key = this._getLocalStorageKey(project, "variables");
        var existing = this._getFromLocalStorage(project, "variables");

        existing[variableName] = value;
        localStorage.setItem(key, JSON.stringify(existing));
    }

    this._getFromLocalStorage = function(project, key, defaultValue){
        var defaultValue = defaultValue != null ? defaultValue : {};

        var key = this._getLocalStorageKey(project, key);
        var existing = localStorage.getItem(key);

        if (existing == null){
            existing = defaultValue;
        } else {
            existing = JSON.parse(existing);
        }

        return existing;
    }

    this._loadVariableFromLocalStorage = function(project) {
        this.currentVariables = this._getFromLocalStorage(project, "variables");

        //force contextual variables...
        this.currentVariables['GEO-OK'] = 0;
        this.currentVariables['GEO-NOK'] = 1;
    }

    this._mediaEventToClass = function(mediaElement, targetElement) {
        var ready = "media_ready";
        var playing = "media_playing";
        var paused = "media_paused";
        var finished = "media_finished";

        var canPlay = "media_can_play";
        var canPause = "media_can_pause";

        //default
        targetElement.classList.add(ready);
        targetElement.classList.add(canPlay);

        mediaElement.addEventListener("playing", function(){
            targetElement.classList.remove(ready);
            targetElement.classList.add(playing);
            targetElement.classList.remove(paused);
            targetElement.classList.remove(finished);

            targetElement.classList.remove(canPlay);
            targetElement.classList.add(canPause);
        });

        mediaElement.addEventListener("pause", function(){
            targetElement.classList.remove(ready);
            targetElement.classList.remove(playing);
            targetElement.classList.add(paused);
            targetElement.classList.remove(finished);

            targetElement.classList.add(canPlay);
            targetElement.classList.remove(canPause);
        });

        mediaElement.addEventListener("ended", function(){
            targetElement.classList.remove(ready);
            targetElement.classList.remove(playing);
            targetElement.classList.remove(paused);
            targetElement.classList.add(finished);

            targetElement.classList.add(canPlay);
            targetElement.classList.remove(canPause);
        });
    }

    this.hasCustomData = function(needle) {
        if (!this.project || !this.project.custom_data) {
            return false;
        }

        needle = " " + needle + " ";
        var data = " " + this.project.custom_data + " ";

        return (data.indexOf(needle) >= 0);
    }

    this.getClassForLinkSlot = function(slotLinkData){
        
        var standardClass = "link";
        var openLinkClass = "open-link";
        var closedLinkClass = "closed-link";

        var variableStatus = this._handleConditionVar(slotLinkData.conditions.variables);
        var geoStatus = this._handleConditionGeo(slotLinkData.conditions.geolocation);

        var finalStatus = {};
        finalStatus[variableStatus] = true;
        finalStatus[geoStatus] = true;

        if (finalStatus.CONDITION_NOK) {
            return closedLinkClass;
        }

        if (finalStatus.CONDITION_OK){
            return openLinkClass;
        }

        return standardClass;
    }

    this._handleConditionVar = function(conditionVariables) {
        
        if (!conditionVariables) {
            return "NO_CONDITION";
        }

        var conditionGt = this._handleConditionGt(conditionVariables, this.currentVariables);
        return conditionGt;
    }

    this._handleConditionGeo = function(conditionGeo) {

        if (!conditionGeo) {
            return "NO_CONDITION";
        }

        var realCount = 0;

        for (var i = 0; i < conditionGeo.length; i++) {
            var line = conditionGeo[i] ? conditionGeo[i].trim() : null;

            if (!line){
                continue;
            }

            if (line.startsWith("#")) {
                continue;
            }

            if (this.currentLocation.status != "ok") {
                return "CONDITION_NOK"; 
            }

            realCount++;
            var res = this._handleConditionGeoRect(line);

            if (res == "CONDITION_OK") {
                return "CONDITION_OK";
            }

        }

        return (realCount==0) ? "CONDITION_OK" : "CONDITION_NOK";
    }

    this._handleConditionGeoRect = function(conditionLine){
        var pattern = /(.*), +(.*)\/ +(.*), +(.*)/;
        var parts = conditionLine.match(pattern);

        console.log(conditionLine);
        console.log(parts);

        if (parts.length != 5) {
            return "NO_CONDITION";
        }

        var minLatitude = Math.min(parts[1], parts[3]);
        var maxLatitude = Math.max(parts[1], parts[3]);

        var minLongitude = Math.min(parts[2], parts[4]);
        var maxLongitude = Math.max(parts[2], parts[4]);

        var latitudeOk = (this.currentLocation.latitude >= minLatitude && this.currentLocation.latitude <= maxLatitude);
        var longitudeOk = (this.currentLocation.longitude >= minLongitude && this.currentLocation.longitude <= maxLongitude);

        return (latitudeOk && longitudeOk) ? "CONDITION_OK" : "CONDITION_NOK";

    }

    this._handleConditionGt = function(condition, currentVariables) {

        if (!condition) {
            return "NO_CONDITION";
        }

        if (condition.length == 0) {
            return "NO_CONDITION";
        }

        var condition = condition[0];

        var parts = condition.split(">");

        if (parts.length != 2) {
            return "NO_CONDITION";
        }

        var name = parts[0].trim();
        var value = parseInt(parts[1].trim());

        if (!currentVariables[name]) {
            return "CONDITION_NOK";
        }

        if (currentVariables[name] < value) {
            return "CONDITION_NOK";
        }

        return "CONDITION_OK";
    }

    this.applyClassBySelector = function(container, selector, className, method){
        var method = (typeof method !== 'undefined') ? method : "add";

        var allItems = container.querySelectorAll(selector);
        for (var i = 0; i < allItems.length; i++) {
            var item = allItems[i];
            item.classList[method](className);
        }
    }


    this._mergeObject = function(objectA, objectB){

        if (! objectA || ! objectB) {
            return;
        }

        for(var key in objectB) {
            objectA[key] = objectB[key];
        }

    };

    this._init = function (self, config) {
        
        if (config) {
            self._mergeObject(self.params, config);
            
        }

        self.allAttributes = Object.keys(self.params.slotHandler);
    }(this, config); //

    

    this._cloneElement = function(elementId) {
        var original = this.params.templateElement.querySelector("#" + elementId);

        if (!original) {
            console.error("Cannot clone template : " + elementId);
            return;
        }

        var clone = original.cloneNode(true);

        clone.setAttribute("id", "");

        return clone;
    }

    this.betterText = function(source){
        var converters = [
            {
                'pattern': /\*\*([^\*]+)\*\*/g,
                'string': '<h2 class="bt heading">$1</h2>'
            },

            {
                'pattern': /\n\+\+\+(.+)/g,
                'string': '<h4 class="bt heading heading3">$1</h3>'
            },

            {
                'pattern': /\n\+\+(.+)/g,
                'string': '<h3 class="bt heading heading2">$1</h3>'
            },

            {
                'pattern': /\n\+(.+)/g,
                'string': '<h2 class="bt heading heading1">$1</h2>'
            },


            {
                'pattern': /\n\-(.+)/g,
                'string': '<li class="bt item">$1</li>'
            },

            {
                'pattern': /\*([^\*]+)\*/g,
                'string': '<em class="bt em">$1</em>'
            },

            {
                'pattern': /\#([^\#]+)\#/g,
                'string': '<em class="bt em">$1</em>'
            },

            {
                'pattern': /\@([^\@]+)\@/g,
                'string': '<strong class="bt strong">$1</strong>'
            },

            //link with title
            {
                'pattern': /\[([^=\n]+) ?= ?(http[^\]\n]*)?\]/g,
                'string': '<a class="bt anchor " target="_blank" href="$2">$1</a>'
            },

            //link without title
            {
                'pattern': /\[(http[^\]\n]*)?\]/g,
                'string': '<a class="bt anchor url" href="$1">$1</a>'
            },

            //image url
            {
                'pattern': /\{(http[^\}]*)?\}/g,
                'string': '<img class="bt img" src="$1" />'
            },

            //image number
            {
                'pattern': /\{media:([0-9]*)?\}/g,
                'string': '<img class="bt media mediaId-$1" frigg-media="$1" src="" />'
            },

            {
                'pattern': /^\n/g,
                'string': ''
            },

            {
                'pattern': /(?:\n)/g,
                'string': '<br>'
            }
        ];

        source = "\n" + source;

        for (var i = 0; i < converters.length; i++) {
            converter = converters[i];
            source = source.replace(converter.pattern, converter.string);
        }

        return source;
    }

    this._bindElement = function(slotElement, sceneData, summary, sceneElement) {
        var numberOfClones = 0;
        var elementSlots = {};

        var recap = {
            binded: {},
            missing: {},
            
        };

        for (var a = 0; a < this.allAttributes.length; a++) {
            var attribute = this.allAttributes[a];
            var value = slotElement.getAttribute(attribute);

            if (!value) {
                continue;
            }

            var slotData = sceneData[value];

            if (!slotData) {
                recap.missing[attribute] = value;
                summary.hasNot.push(value);
                continue;
            }

            summary.has.push(value);

            recap.binded[attribute] = true;
            elementSlots[attribute] = {
                data: slotData,
                identifier: value
            };

            numberOfClones = Math.max(slotData.length -1, numberOfClones);
        }

        var parent = slotElement.parentNode;


        var clones = [];

        //clone before the first bind, to clone the origin element, not a binded one.
        for (var i = 0; i < numberOfClones; i++) {
            var clone = slotElement.cloneNode(true);
            clones.push(clone);
        }

        this._bindOneElement(slotElement, 0, elementSlots, sceneElement);
        
        for (var i = 0; i < numberOfClones; i++) {
            var clone = clones[i];
            parent.appendChild(clone);

            this._bindOneElement(clone, i+1, elementSlots, sceneElement);
        }


        //console.log("Recap slots : ");
        
        
        var binded = Object.keys(recap.binded).length;
        var missing = Object.keys(recap.missing).length;

        if (binded == 0 && missing > 0) {
            for (var attribute in recap.missing) {
                var identifier = recap.missing[attribute]
                
                this.params.slotHandler[attribute].bind(this)(slotElement, {
                    'valueToBind': null, 
                    'slotIdentifier': identifier, 
                    'sceneElement': sceneElement,
                    'frigg': this
                });
            }
        }


    }

    this._bindOneElement = function(elementToBind, index, elementSlots, sceneElement) {

        //console.log(elementToBind);
        //console.log("Bind element at index " + index);
        //console.log(elementSlots);

        for(var slot in elementSlots) {
            var slotValues = elementSlots[slot].data;
            var slotIdentifier = elementSlots[slot].identifier;
            var value;

            //console.log("Slot: " + slotIdentifier);

            if (index >= slotValues.length) {
                value = slotValues[ slotValues.length -1 ];
            } else {
                value = slotValues[ index ];
            }

            //console.log(" value: " + value);

            this.params.slotHandler[slot].bind(this)(elementToBind, {
                'valueToBind': value, 
                'slotIdentifier': slotIdentifier, 
                'sceneElement': sceneElement,
                'frigg': this
            });
        

        }

    }

    this._pushNewScene = function(newScene, sceneId) {
        if (this.currentSceneElement) {
            this.currentSceneElement.classList.add("inBackground");
            this.currentSceneElement.classList.remove("inFront")
        }
        
        newScene.setAttribute("frigg-scene-id", sceneId);
        this.params.containerElement.appendChild(newScene);
        newScene.classList.add("inFront");

        this.currentSceneElement = newScene;
        this.sceneElementHistory.push(newScene);
        this.sceneIdHistory.push(sceneId);
    }

    this._pushExistingScene = function(newScene, sceneId) {
        if (this.currentSceneElement) {
            this.currentSceneElement.classList.add("inBackground");
            this.currentSceneElement.classList.remove("inFront")
        }
        
        newScene.classList.add("inFront");

        this.currentSceneElement = newScene;
    }

    this._pauseAndResetPausableElements = function(){
        for (var i = 0; i < this.pausableElements.length; i++) {
            this.pausableElements[i].pause();
        }

        this.pausableElements = [];
    }

    this._bindTemplate = function(templateName, sceneData, sceneId) {
        this._pauseAndResetPausableElements();

        var fullTemplateName = this.params.templatePrefix + templateName;
        var clone = this._cloneElement(fullTemplateName);
        
        clone.classList.add(fullTemplateName);
        clone.classList.add('scene_' + sceneId);
        clone.classList.add('scene');

        var selector = "[" + this.allAttributes.join("],[") + "]";

        //all elements with at least one frigg-* attribute
        var slotElements = clone.querySelectorAll(selector);
        var summary = {
            has: [],
            hasNot: [],
        };

        //bind the element itself...
        this._bindElement(clone, sceneData, summary, clone);

        //then the children
        for (var i = 0; i < slotElements.length; i++) {
            var slotElement = slotElements[i];
            this._bindElement(slotElement, sceneData, summary, clone);
        }  

        this._bindElementClasses(clone, summary);

        this._pushNewScene(clone, sceneId);

        if (this.params.onTemplateLoaded[templateName] != undefined) {
            this.params.onTemplateLoaded[templateName](clone, sceneData, this);
        }

        if (this.pausableElements.length) {
            this.params.onPausableBinded(clone, sceneData, this.pausableElements, this);
        }
    }

    this._bindElementClasses = function(element, summary){

        this._bindElementClassList(element, "has_", summary.has);
        this._bindElementClassList(element, "has_not_", summary.hasNot);
        
    }

    this._bindElementClassList = function(element, prefix, list){
        for(var i in list) {
            var className = prefix + list[i];
            element.classList.add(className);
        }
    }

    this._loadProject = function(projectId, projectReadyCallback) {
        var url = this.params.projectUrlPrefix + projectId
        var request = new XMLHttpRequest();

        request.open('GET', url);
        request.addEventListener('load', function (event){
            this.project = JSON.parse(event.target.responseText);
            this._prepareProject();
            this._projectIsReady();
        this._ini

        }.bind(this));

        request.addEventListener('error', function (){
            this.project = {};
        }.bind(this));

        request.send();
    }

    this._prepareProject = function(){

        this._mapAnonymousConnections();
        this._fixSvgBug();
        this._prepareDebugger();
    }

    this._prepareDebugger = function(){
        this.params.debuggerElement.addEventListener("click", function(){

                this.classList.toggle("opposite");

        })

    }

    this._mapAnonymousConnections = function(){

        var alreadyMapped = {};

        //fill already mapped connections, by scene id.
        for(var sceneId in this.project.scenes) {
            var scene = this.project.scenes[sceneId];
            
            alreadyMapped[sceneId] = {};

            for(var connectionIndex in scene.connections) {
                var connection = scene.connections[connectionIndex];

                if (Array.isArray(connection.id)) {
                    for (var i = 0; i < connection.id.length; i++) {
                        alreadyMapped[sceneId][connection.id[i]] = true;
                    }
                } else {
                    alreadyMapped[sceneId][connection.id] = true;
                }

            }
            
        }

        //browse all connection to find unmapped connection by scene id ...
        var mapTodo = {};

        for(var connectionId in this.project.connections) {
            var connection = this.project.connections[connectionId];
            
            var sceneId = connection.origin_scene_id;

            //console.log("Connection " + connectionId + " from scene " + sceneId + " ...");
            
            if (alreadyMapped[sceneId] && alreadyMapped[sceneId][connectionId]) {
                //already mapped
                //console.log("already mapped");
            } else if (this.project.scenes[sceneId]) {
                //console.log("to be mapped to scene " + sceneId);

                //add it to the scene
                var scene = this.project.scenes[sceneId];

                if (!scene.connections) {
                    scene.connections = [];
                }

                if (!mapTodo[sceneId]) {
                    mapTodo[sceneId] = {};
                }

                mapTodo[sceneId][connectionId] = true;

            }
        }

        //...then map them as "_anonymous" to the origin scene.

        for(var sceneId in mapTodo) {
            var scene = this.project.scenes[sceneId];

            scene.connections.push({
                'id': Object.keys(mapTodo[sceneId]),
                'slot': "_anonymous_connection"
            });
        }

        
        //console.log(this.project);

        
    }

    this._fixSvgBug = function(){
        for(mediaId in this.project.medias){
            var media = this.project.medias[mediaId];

            if (media.type == 'image' && media.content.endsWith('.') ) {
                media.content = media.content + "svg";
            }
        }
    }
    
    this._initCustomStyle = function(){
        if (!this.project.custom_css) {
            return
        }

        var customStyle = document.createElement('style');
        customStyle.type = 'text/css';

        customStyle.appendChild(document.createTextNode(this.project.custom_css));
        document.head.appendChild(customStyle)
    }

    this._initCustomData = function(){
        //this.project.custom_data = "test autoPlayAudio showDebugger";
        if (!this.project.custom_data) {
            return;
        }

        var baseElement = document.body //this.params.containerElement

        var classes = baseElement.getAttribute('class') + ' ' + this.project.custom_data;
        baseElement.setAttribute('class', classes);
    }

    this._initProjectDom = function(){
        this._initCustomStyle();
        this._initCustomData();
    }

    this._projectIsReady = function(){
        this._loadVariableFromLocalStorage(this.project);
        this._initProjectDom();
        this.params.onProjectLoaded(this.project);
        this._showSceneFromHash();
    }

    this._sceneIndexInHistory = function(sceneId){
        var index = this.sceneIdHistory.indexOf(sceneId);
        return index;    
    }

    //include itself !
    this._clearHistoryUntil = function(sceneId, sceneIndex){

        //console.log("CURRENT HISTORY:");
        //console.log(this.sceneElementHistory);
        //console.log(this.sceneIdHistory);

        var count = this.sceneElementHistory.length;

        for (var i = count - 1; i >= sceneIndex; i--) {
            console.log("Remove child : " + i);
            var sceneElement = this.sceneElementHistory[i];
            sceneElement.parentNode.removeChild(sceneElement);
            //console.log(sceneElement);
        }

        this.sceneElementHistory = this.sceneElementHistory.slice(0, sceneIndex);
        this.sceneIdHistory = this.sceneIdHistory.slice(0, sceneIndex);
        
        //console.log("CLEARED HISTORY:");
        //console.log(this.sceneElementHistory);
       // console.log(this.sceneIdHistory);

        return this.sceneElementHistory[ this.sceneElementHistory.length - 1];
    }

    this._restoreScene = function(sceneId, scene){
        this._pushExistingScene(scene, sceneId);

        /*if (this.params.onTemplateRestored[templateName] != undefined) {
            this.params.onTemplateRestored[templateName](scene, sceneData, this);
        }*/

        return false;    
    }

    this.hasPreviousScene = function(){
        var previousSceneIndex = this.sceneIdHistory.length -2;

        if (previousSceneIndex < 0) {
            return false;
        }

        return true;
    }

    this.previousScene = function(){
        var previousSceneIndex = this.sceneIdHistory.length -2;

        if (previousSceneIndex < 0) {
            return;
        }

        var previousSceneId = this.sceneIdHistory[ previousSceneIndex ];
        this.gotoScene(previousSceneId);
    }

    this.firstScene = function(){
        var firstSceneId = this.sceneIdHistory[ 0 ];
        this.gotoScene(firstSceneId);
    }

    this._handleSceneVariables = function(scene) {
        if (! scene.variables) {
            return;
        }

        var vars = scene.variables.split("\n");
        for (var i = 0; i < vars.length; i++) {
            var line = vars[i];

            this._handleSceneVariableLine(scene, line);
        }
    }

    this._handleSceneVariableLine = function(scene, line) {
        this._handleSceneVariableLine_equals(scene, line);
        this._handleSceneVariableLine_increment(scene, line);
    }

    this._handleSceneVariableLine_equals = function(scene, line) {
        var parts = line.split("=");

        if (parts.length != 2){
            return false;
        }

        var name = parts[0].trim();
        var value = parts[1].trim();

        this.currentVariables[name] = parseInt(value);

        this.params.onVariableChanged(this.project, scene, name, this.currentVariables[name]);
        this._saveVariableToLocalStorage(this.project, name, this.currentVariables[name]);

        return true;
    }

    this._handleSceneVariableLine_increment = function(scene, line) {
        var parts = line.split("+");

        if (parts.length != 2){
            return false;
        }

        var name = parts[0].trim();
        var value = parts[1].trim();
        var newValue = parseInt(value);

        if (this.currentVariables[name]){
            newValue += parseInt(this.currentVariables[name]);
        }

        this.currentVariables[name] = newValue;
        this.params.onVariableChanged(this.project, scene, name, this.currentVariables[name]);
        this._saveVariableToLocalStorage(this.project, name, this.currentVariables[name]);

        return true;
    }

    this._loadProjectFromHash = function(){
        var projectId = this.forcedProjectId ? this.forcedProjectId : this._getHashParam("project");

        if (!projectId) {
            console.error("No project to load.");
            //todo callback
            return;
        }

        console.log("Hash event : Will load project " + projectId);
        this._loadProject(projectId);
        
    }

    this._showSceneFromHash = function(){
        var param = this._getHashParam("scene");

        var sceneId = param ? param : this.project.start_scene_id;

        if (!sceneId) {
            return console.error("No initial scene to show. Have you defined a start scene in the studio ?")
        }

        this.updatePageTitle(sceneId);

        console.log("Hash event : Will show scene " + sceneId);
        this.showScene(sceneId);
    }

    this.updatePageTitle = function(sceneId){
        document.title = this.project.label;/* + " - scène " + sceneId*/;
    }

    this.gotoScene = function(sceneId) {
        window.location.hash = "project=" + this.project.project_id + "&scene=" + sceneId;
        this.updatePageTitle(sceneId);
    }

    this.getDestinationSceneId = function (connectionId) {
        if (!connectionId) {
            return null;
        }

        return this.project.connections[connectionId].destination_scene_id
    }

    this.showScene = function(sceneId){
        console.log("Showing scene " + sceneId);

        var scene = this.project.scenes[sceneId];
        var template = this.project.templates[scene.template_id];

        if (template.label == "meta") {
            console.log("Meta scene found. Redirecting to next concrete scene");
            var nextConnection = scene.connections[0].id[0];
            this.showScene(this.getDestinationSceneId(nextConnection));
            return
        }

        this.params.onSceneLoaded(scene, this.project);
        this._saveHistoryToLocalStorage(this.project, scene);

        this._handleSceneVariables(scene);

        

        var sceneIndex = this._sceneIndexInHistory(sceneId);

        if (sceneIndex > -1) {
            var sceneElement = this._clearHistoryUntil(sceneId, sceneIndex);
            //this._restoreScene(sceneId, sceneElement);
            //this._updateDebugger(scene, template);
            //return;
        }

        var slots = this._buildSlotContent(scene);
    
        this._bindTemplate(this._cleanTemplateName(template.label), slots, sceneId)
        this._updateDebugger(scene, template);

        this.onSceneBinded(scene, this.project);
        //console.log("SHOW SCENE END:");
        //console.log(this.sceneElementHistory);
    }

    this._cleanTemplateName = function(templateName){
        var pattern = /[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g;
        return templateName.replace(" ", "_").replace(pattern, "e");
    }

    this._updateDebugger = function(scene, template){
        var sceneId = scene.id;

        this.params.debuggerElement.innerHTML = "<h2>Scene n°"+sceneId+ " (" + template.label + ")</h2>";
        var connectionCount = 0;
        
        for (var i in this.project.connections) {
            var connection = this.project.connections[i];
            if (connection.origin_scene_id == sceneId) {
                this.params.debuggerElement.appendChild(this._makeDebuggerItem(connection));
                connectionCount++;
            }
        }

        if (connectionCount==0){
            this.params.debuggerElement.innerHTML += "<p>Pas de connections</p>";
        }

        if (this.hasPreviousScene()) {
            this.params.debuggerElement.appendChild(this._makeDebuggerPreviousItem() );    
        }

        //vars
        var count = 0;
        for (var v in this.currentVariables) {
            this.params.debuggerElement.appendChild(this._makeDebuggerVariableItem(count++, v, this.currentVariables[v]) );
        }
        
        if (this.project.custom_data){
            this.params.debuggerElement.appendChild(this._makeDebuggerSimpleItem(this.project.custom_data, "Custom data"));
        }

        this.params.debuggerElement.appendChild(this._makeDebuggerSimpleItem(this.currentLocation.status, "Location status", "separated"));

        if (this.currentLocation.status == "ok") {
            this.params.debuggerElement.appendChild(this._makeDebuggerSimpleItem(this.currentLocation.latitude, "Latitude"));
            this.params.debuggerElement.appendChild(this._makeDebuggerSimpleItem(this.currentLocation.longitude, "Longitude"));
        }
    }

    this._makeDebuggerSimpleItem = function(text, title, theClass){
        var item = document.createElement("li");
        if (theClass) item.setAttribute("class", theClass);

        item.innerHTML = (title?title+" : " : '') + text;
        return item;
    }

    this._makeDebuggerItem = function(connection){
        var item = document.createElement("li");
        item.innerHTML = connection.label + " (n°" + connection.destination_scene_id + ")";
        item.addEventListener('click', function(event){
            event.stopPropagation();
            this.gotoScene(connection.destination_scene_id);
        }.bind(this));

        if (connection.conditions.variables) {
            var moreInfo = document.createElement("span");
            moreInfo.setAttribute("class", "moreInfo");
            moreInfo.innerHTML = connection.conditions.variables.join("<br/>");

            item.appendChild(moreInfo);
        }

        if (connection.conditions.geolocation) {
            var moreInfo = document.createElement("span");
            moreInfo.setAttribute("class", "moreInfo");
            moreInfo.innerHTML = connection.conditions.geolocation.join("<br/>");

            item.appendChild(moreInfo);
        }

        return item;
    }

    this._makeDebuggerPreviousItem = function(){
        var item = document.createElement("li");
        item.setAttribute("class", "separated");
        item.innerHTML = "Scéne précédente";
        item.addEventListener('click', function(event){
            event.stopPropagation();
            this.previousScene();
        }.bind(this));

        return item;
    }

    this._makeDebuggerVariableItem = function(index, name, value){
        var item = document.createElement("li");
        if (index==0) item.setAttribute("class", "separated");
        item.innerHTML = "Variable : " + name + " = " + value ;
        return item;
    }

    this._buildSlotContent = function(scene) {
        var slots={};

        slots = this._buildSlotContentArray(slots, scene, 'medias');
        slots = this._buildSlotContentArray(slots, scene, 'connections');

        return slots;
    }

    this._buildSlotContentArray = function(slots, scene, key){
        if (scene[key] == undefined) {
            return slots;
        }

        for (var i = 0; i < scene[key].length; i++) {
            var info = scene[key][i];
            slots[info.slot] = [];

            if (! Array.isArray(info.id)){
                info.id = [info.id];
            }


            for (var m = 0; m < info.id.length; m++) {
                slots[info.slot].push( this.project[key][ info.id[m] ] );
            }

        }
        
        return slots;
    }

    this._hashToObject = function(){
        var hash = window.location.hash.substr(1);

        var result = hash.split('&').reduce(function (result, item) {
            var parts = item.split('=');
            result[parts[0]] = parts[1];
            return result;
        }, {});

        return result;
    }

    this._getHashParam = function(paramName) {
        var params = this._hashToObject();
        if (params[paramName]) {
            return params[paramName];
        }

        return null;
    }

    this._processHash = function() {
        if (!this.project || !this.project.project_id) {
            this._loadProjectFromHash();
            return;
        }

        this._showSceneFromHash();
    }

   
    this._initHashChangeListener = function() {
        window.addEventListener("hashchange", function(){
            console.log("Hash changed");
            this._processHash();

        }.bind(this));
    }

    this._initFirstClick = function(){

        document.body.classList.add('geo-nok');

        var that = this;
        document.addEventListener("click", function fn() {
            //console.log("First click");
            that._initLocationListener();
            document.removeEventListener("click", fn);
        });

    }


    this._initLocationListener = function(){

        if (! this.hasCustomData("enableGeolocation")) {
            return;
        }

        if (! navigator.geolocation) {
            console.error("No geolocation on this device.");
            return;
        }

        var options = {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        };

        navigator.geolocation.watchPosition(function(event){
            this._processLocation(event.coords, event.timestamp)
        }.bind(this), function(){
            this._processErrorLocation();
        }.bind(this), options);
    }

    this._processLocation = function(location, timestamp) {
        this.currentLocation.status = "ok";
        this.currentLocation.latitude = location.latitude;
        this.currentLocation.longitude = location.longitude;
        this.currentLocation.timestamp = timestamp;

        document.body.classList.remove('geo-nok');
        document.body.classList.add('geo-ok');

        this.currentVariables['GEO-OK'] = 1;
        this.currentVariables['GEO-NOK'] = 0;

    }

    this._processErrorLocation = function() {
        var now = Date.now();

        if (this.currentLocation.status == "ok" && this.currentLocation.timestamp > now - (60*60)) {
            console.log("ignore error.");
            return;
        }

        this.currentLocation.status = "error";
        this.currentLocation.latitude = 0;
        this.currentLocation.longitude = 0;
        this.currentLocation.timestamp = now;

        document.body.classList.remove('geo-ok');
        document.body.classList.add('geo-nok');

        this.currentVariables['GEO-OK'] = 0;
        this.currentVariables['GEO-NOK'] = 1;
    }

    this.run = function(forcedProjectId){
        
        this.forcedProjectId = forcedProjectId;

        this._initFirstClick();

        this._initHashChangeListener();
        this._processHash();



    }

    this.onSceneBinded = function(){
        this.handleBetterText();
        this.params.onSceneBinded();
    }

    this.handleBetterText = function() {
        var items = document.querySelectorAll(".bt.media");

        items.forEach(function(item){
            this.mapMediaSrc(item)
        }, this);


    }

    this.mapMediaSrc = function(item){
        try{
            var mediaId = item.getAttribute("frigg-media");
            var media = this.project.medias[mediaId];

            if (media.type != 'image'){
                throw new Exception("");
            }

            item.setAttribute("src", this.params.mediaFilePrefix + media.content);
        } catch (e) {
            item.classList.add("invalid");
        }

    }

}