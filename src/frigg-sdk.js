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

    this.currentVariables = {}
    this.project = {};

    this.sceneElementHistory = [];
    this.sceneIdHistory = [];
    this.currentSceneElement = null;

    this.forcedInitialScene = null;

    this.params = {
        'mediaFilePrefix': 'https://admin.systeme-frigg.org/storage/',
        'templatePrefix' : "tpl_",
        'containerElement' : document.getElementById("friggContainer"),
        'templateElement' : document.getElementById("friggTemplates"),
        'debuggerElement' : document.getElementById("friggDebugger"),

        'slotHandler' : {
            'frigg-slot-html' : function(element, slotData, frigg) {
                if (slotData == null) {
                    element.classList.add("empty");
                    return;
                }

                element.innerHTML = frigg.betterText(slotData.content);
            },
            'frigg-slot-bg' : function(element, slotData) {
                if (slotData == null) {
                    return;
                }

                element.style.backgroundImage = "url(" + this.params.mediaFilePrefix + slotData.content + ")";
            },
            'frigg-slot-srcAlt' : function(element, slotData) {
                if (slotData == null) {
                    element.classList.add("empty");
                    return;
                }

                var src = slotData.content;
                if (! src.startsWith("http")) {
                    src = this.params.mediaFilePrefix + src;
                }

                element.setAttribute("src", src);
                element.setAttribute("alt", slotData.description);

                if (element.pause) this.pausableElements.push(element);
            },
            'frigg-slot-link' : function(element, slotData, frigg) {
                if (slotData == null) {
                    return;
                }

                var className = frigg.getClassForLinkSlot(slotData);

                element.classList.add("link");
                element.classList.add(className);

                element.addEventListener("click", function(event){
                    event.preventDefault();
                    this.gotoScene(slotData.destination_scene_id);
                }.bind(this))
            },
        }, 

        'onMediaPlayed' : function(scene){

        },

        'onProjectLoaded' : function(project){

        },

        'onSceneLoaded' : function(scene, project){

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
    }

    this.getClassForLinkSlot = function(slotLinkData){
        var standardClass = "link";
        var openLinkClass = "open-link";
        var closedLinkClass = "closed-link";

        if (!slotLinkData.conditions.variables) {
            return standardClass;
        }

        var conditionGt = this._handleConditionGt(slotLinkData.conditions.variables, this.currentVariables);
        if (conditionGt == "CONDITION_NOK") {
            return closedLinkClass;
        }

        if (conditionGt == "CONDITION_OK") {
            return openLinkClass;
        }

        return standardClass;
    }

    this._handleConditionGt = function(condition, currentVariables) {

        if (!condition) {
            return;
        }

        if (condition.length == 0) {
            return;
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
                'pattern': /\*([^\*]+)\*/g,
                'string': '<em class="bt em">$1</em>'
            },

            {
                'pattern': /(?:\n)/g,
                'string': '<br>'
            }
        ];

        for (var i = 0; i < converters.length; i++) {
            converter = converters[i];
            source = source.replace(converter.pattern, converter.string);
        }

        return source;
    }

    this._bindElement = function(slotElement, sceneData) {
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
                recap.missing[attribute] = true;
                continue;
            }

            recap.binded[attribute] = true;
            elementSlots[attribute] = slotData;

            numberOfClones = Math.max(slotData.length -1, numberOfClones);
        }

        var parent = slotElement.parentNode;


        var clones = [];

        //clone before the first bind, to clone the origin element, not a binded one.
        for (var i = 0; i < numberOfClones; i++) {
            var clone = slotElement.cloneNode(true);
            clones.push(clone);
        }

        this._bindOneElement(slotElement, 0, elementSlots);
        
        for (var i = 0; i < numberOfClones; i++) {
            var clone = clones[i];
            parent.appendChild(clone);

            this._bindOneElement(clone, i+1, elementSlots);
        }


        //console.log("Recap slots : ");
        //console.log(recap);
        
        var binded = Object.keys(recap.binded).length;
        var missing = Object.keys(recap.missing).length;

        if (binded == 0 && missing > 0) {
            for (var attribute in recap.missing) {
                this.params.slotHandler[attribute].bind(this)(slotElement, null, this);
            }
        }

    }

    this._bindOneElement = function(elementToBind, index, elementSlots) {

        //console.log(elementToBind);
        //console.log("Bind element at index " + index);
        //console.log(elementSlots);

        for(var slot in elementSlots) {
            var slotValues = elementSlots[slot];
            var value;

            //console.log("Slot: " + slot);

            if (index >= slotValues.length) {
                value = slotValues[ slotValues.length -1 ];
            } else {
                value = slotValues[ index ];
            }

            //console.log(" value: " + value);

            this.params.slotHandler[slot].bind(this)(elementToBind, value, this);

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
        clone.classList.add(fullTemplateName); //replace id by class...

        var selector = "[" + this.allAttributes.join("],[") + "]";

        var slotElements = clone.querySelectorAll(selector);
        
        for (var i = 0; i < slotElements.length; i++) {
            var slotElement = slotElements[i];
            this._bindElement(slotElement, sceneData);
        }

        this._pushNewScene(clone, sceneId);

        if (this.params.onTemplateLoaded[templateName] != undefined) {
            this.params.onTemplateLoaded[templateName](clone, sceneData, this);
        }

        if (this.pausableElements.length) {
            this.params.onPausableBinded(clone, sceneData, this.pausableElements, this);
        }
    }

    this._loadProject = function(projectId, projectReadyCallback) {
        var url = "https://admin.systeme-frigg.org/api/project/" + projectId;
        //var url = "http://frigg.local/api/project/" + projectId;

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
            this.classList.toggle("hidden");
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
    
    this._projectIsReady = function(){
        this._loadVariableFromLocalStorage(this.project);

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
            console.log(sceneElement);
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

    this.showScene = function(sceneId){

        var scene = this.project.scenes[sceneId];

        this.params.onSceneLoaded(scene, this.project);
        this._saveHistoryToLocalStorage(this.project, scene);

        this._handleSceneVariables(scene);

        var template = this.project.templates[scene.template_id];

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

        //console.log("SHOW SCENE END:");
        //console.log(this.sceneElementHistory);
    }

    this._cleanTemplateName = function(templateName){
        var pattern = /[\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD]/g;
        return templateName.replace(" ", "_").replace(pattern, "e");
    }

    this._updateDebugger = function(scene, template){
        var sceneId = scene.id;

        this.params.debuggerElement.innerHTML = "<h2>Scene "+sceneId+ " (" + template.label + ")</h2>";
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
        
    }

    this._makeDebuggerItem = function(connection){
        var item = document.createElement("li");
        item.innerHTML = connection.label + " (vers scene " + connection.destination_scene_id + ")";
        item.addEventListener('click', function(){
            this.gotoScene(connection.destination_scene_id);
        }.bind(this));

        return item;
    }

    this._makeDebuggerPreviousItem = function(){
        var item = document.createElement("li");
        item.setAttribute("class", "separated");
        item.innerHTML = "Scéne précédente";
        item.addEventListener('click', function(){
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


    this.run = function(forcedProjectId){

        this.forcedProjectId = forcedProjectId;
        this._initHashChangeListener();
        this._processHash();

    }
}