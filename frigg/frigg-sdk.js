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

FRIGG.Client = function (params){

    this.project = {};

    this.sceneElementHistory = [];
    this.currentSceneElement = null;

    this.params = {
        'mediaFilePrefix': 'http://admin.systeme-frigg.org/storage/',
        'templatePrefix' : "tpl_",
        'containerElement' : document.getElementById("friggContainer"),
        'templateElement' : document.getElementById("friggTemplates"),
        'debuggerElement' : document.getElementById("friggDebugger"),

        'slotHandler' : {
            'frigg-slot-html' : function(element, slotData) {
                element.innerHTML = slotData.content;
            },
            'frigg-slot-bg' : function(element, slotData) {
                element.style.backgroundImage = "url(" + this.params.mediaFilePrefix + slotData.content + ")";
            },
            'frigg-slot-srcAlt' : function(element, slotData) {
                element.setAttribute("src", this.params.mediaFilePrefix + slotData.content);
                element.setAttribute("alt", slotData.description);
            },
            'frigg-slot-link' : function(element, slotData) {
                element.addEventListener("click", function(event){
                    event.preventDefault();
                    console.log("vers la scene " +slotData.destination_scene_id);
                    this._showScene(slotData.destination_scene_id);
                }.bind(this))
            },
        }
    };

    this.allAttributes = [];

    this._init = function (self, params) {
        //self.params.templateElement.style.display = "none";
        self.allAttributes = Object.keys(self.params.slotHandler);
    }(this, params); //

    

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

        for (var a = 0; a < this.allAttributes.length; a++) {
            var attribute = this.allAttributes[a];
            var value = slotElement.getAttribute(attribute);

            if (!value) {
                continue;
            }

            var slotData = sceneData[value];

            if (!slotData) {
                continue;
            }

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

            this.params.slotHandler[slot].bind(this)(elementToBind, value);
        }

    }

    this._pushNewScene = function(newScene) {
        if (this.currentSceneElement) {
            this.currentSceneElement.classList.add("inBackground");
            this.currentSceneElement.classList.remove("inFront")
        }
        
        this.params.containerElement.appendChild(newScene);
        newScene.classList.add("inFront");

        this.currentSceneElement = newScene;
        this.sceneElementHistory.push(newScene);
    }

    this._bindTemplate = function(templateName, sceneData) {
        var clone = this._cloneElement(this.params.templatePrefix + templateName);

        var selector = "[" + this.allAttributes.join("],[") + "]";

        var slotElements = clone.querySelectorAll(selector);
        
        for (var i = 0; i < slotElements.length; i++) {
            var slotElement = slotElements[i];
            this._bindElement(slotElement, sceneData);
        }

        this._pushNewScene(clone);
    }

    this._loadProject = function(projectId, projectReadyCallback) {
        var url = "http://admin.systeme-frigg.org/api/project/" + projectId;
        //var url = "http://frigg.local/api/project/" + projectId;

        var request = new XMLHttpRequest();

        request.open('GET', url);
        request.addEventListener('load', function (event){
            this.project = JSON.parse(event.target.responseText);
            this._projectIsReady();
        }.bind(this));

        request.addEventListener('error', function (){
            this.project = {};
        }.bind(this));

        request.send();
    }

    this._projectIsReady = function(){
        console.log(this.project);
        //this._showScene(3);
        this._showScene(this.project.start_scene_id);
    }

    this._showScene = function(sceneId){
        var scene = this.project.scenes[sceneId];
        console.log(scene);

        var template = this.project.templates[scene.template_id];

        var slots = this._buildSlotContent(scene);
        console.log(slots);
        this._bindTemplate(this._cleanTemplateName(template.label), slots)

        this._updateDebugger(scene, template);
    }

    this._cleanTemplateName = function(templateName){
        return templateName.replace(" ", "_").replace("é", "e");
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
    }

    this._makeDebuggerItem = function(connection){
        var item = document.createElement("li");
        item.innerHTML = connection.label + " (vers scene " + connection.destination_scene_id + ")";
        item.addEventListener('click', function(){
            this._showScene(connection.destination_scene_id);
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

    this.run = function(projectId){
        this._loadProject(projectId);
    }
}