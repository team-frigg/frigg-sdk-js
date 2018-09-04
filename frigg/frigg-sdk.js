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

    this.project = {};

    this.sceneElementHistory = [];
    this.sceneIdHistory = [];
    this.currentSceneElement = null;

    this.forcedInitialScene = null;

    this.params = {
        'mediaFilePrefix': 'http://admin.systeme-frigg.org/storage/',
        'templatePrefix' : "tpl_",
        'containerElement' : document.getElementById("friggContainer"),
        'templateElement' : document.getElementById("friggTemplates"),
        'debuggerElement' : document.getElementById("friggDebugger"),

        'slotHandler' : {
            'frigg-slot-html' : function(element, slotData) {
                if (slotData == null) {
                    element.classList.add("empty");
                    return;
                }

                element.innerHTML = slotData.content;
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

                element.setAttribute("src", this.params.mediaFilePrefix + slotData.content);
                element.setAttribute("alt", slotData.description);
            },
            'frigg-slot-link' : function(element, slotData) {
                if (slotData == null) {
                    return;
                }

                element.classList.add("link");

                element.addEventListener("click", function(event){
                    event.preventDefault();
                    this.showScene(slotData.destination_scene_id);
                }.bind(this))
            },
        }, 

        'onTemplateLoaded' : {
            
        }
    };

    this.allAttributes = [];

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

        this._bindOneElement(slotElement, 0, elementSlots);
        
        for (var i = 0; i < numberOfClones; i++) {
            var clone = slotElement.cloneNode(true);
            parent.appendChild(clone);

            this._bindOneElement(clone, i+1, elementSlots);
        }


        //console.log("Recap slots : ");
        //console.log(recap);
        
        var binded = Object.keys(recap.binded).length;
        var missing = Object.keys(recap.missing).length;

        if (binded == 0 && missing > 0) {
            for (var attribute in recap.missing) {
                this.params.slotHandler[attribute].bind(this)(slotElement, null);
            }
        }

    }

    this._bindOneElement = function(elementToBind, index, elementSlots) {

        //console.log(elementToBind);
        console.log("Bind element at index " + index);
        //console.log(elementSlots);

        for(var slot in elementSlots) {
            var slotValues = elementSlots[slot];
            var value;

            console.log("Slot: " + slot);

            if (index >= slotValues.length) {
                value = slotValues[ slotValues.length -1 ];
            } else {
                value = slotValues[ index ];
            }
            
            console.log(" value: " + value);

            this.params.slotHandler[slot].bind(this)(elementToBind, value);
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

    this._bindTemplate = function(templateName, sceneData, sceneId) {
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
    }

    this._loadProject = function(projectId, projectReadyCallback) {
        var url = "http://admin.systeme-frigg.org/api/project/" + projectId;
        //var url = "http://frigg.local/api/project/" + projectId;

        var request = new XMLHttpRequest();

        request.open('GET', url);
        request.addEventListener('load', function (event){
            this.project = JSON.parse(event.target.responseText);
            this._prepareProject();
            this._projectIsReady();
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
        var sceneId = this.forcedInitialScene ? this.forcedInitialScene : this.project.start_scene_id;
        this.showScene(sceneId);
    }

    this._sceneIndexInHistory = function(sceneId){
        var index = this.sceneIdHistory.indexOf(sceneId);
        return index;    
    }

    this._clearHistoryUntil = function(sceneId, sceneIndex){

        console.log("CURRENT HISTORY:");
        console.log(this.sceneElementHistory);


        var count = this.sceneElementHistory.length;

        for (var i = count - 1; i > sceneIndex; i--) {
            var sceneElement = this.sceneElementHistory[i];
            sceneElement.parentNode.removeChild(sceneElement);
        }

        this.sceneElementHistory = this.sceneElementHistory.slice(0, sceneIndex+1);
        this.sceneIdHistory = this.sceneIdHistory.slice(0, sceneIndex+1);
        
        
        console.log("CLEARED HISTORY:");
        console.log(this.sceneElementHistory);

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
        this.showScene(previousSceneId);
    }

    this.showScene = function(sceneId){

        var scene = this.project.scenes[sceneId];
        var template = this.project.templates[scene.template_id];

        var sceneIndex = this._sceneIndexInHistory(sceneId);

        if (sceneIndex > -1) {
            var sceneElement = this._clearHistoryUntil(sceneId, sceneIndex);
            this._restoreScene(sceneId, sceneElement);
            this._updateDebugger(scene, template);
            return;
        }

        
        var slots = this._buildSlotContent(scene);
    
        this._bindTemplate(this._cleanTemplateName(template.label), slots, sceneId)
        this._updateDebugger(scene, template);

        console.log("SHOW SCENE END:");
        console.log(this.sceneElementHistory);
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
        
    }

    this._makeDebuggerItem = function(connection){
        var item = document.createElement("li");
        item.innerHTML = connection.label + " (vers scene " + connection.destination_scene_id + ")";
        item.addEventListener('click', function(){
            this.showScene(connection.destination_scene_id);
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

    this.run = function(projectId, sceneId){
        this.forcedInitialScene = sceneId;
        this._loadProject(projectId);
    }
}