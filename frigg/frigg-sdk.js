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

        'slotHandler' : {
            'frigg-slot-html' : function(element, media) {
                element.innerHTML = media.content;
            },
            'frigg-slot-bg' : function(element, media) {
                element.style.backgroundImage = "url(" + this.params.mediaFilePrefix + media.content + ")";
            },
            'frigg-slot-srcAlt' : function(element, media) {
                element.setAttribute("src", this.params.mediaFilePrefix + media.content);
                element.setAttribute("alt", media.description);
            },
            'frigg-slot-link' : function(element, media) {
                element.addEventListener("click", function(event){
                    event.preventDefault();

                    alert(media);
                })
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
        
        newScene.classList.add("inFront");
        this.params.containerElement.appendChild(newScene);

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
        this._showScene(this.project.start_scene_id);
    }

    this._showScene = function(sceneId){
        var scene = this.project.scenes[sceneId];
        console.log(scene);

        var template = this.project.templates[scene.template_id];

        var slots = this._buildSlotContent(scene);
        this._bindTemplate(template.label, slots)

    }

    this._buildSlotContent = function(scene) {
        var slots={};

        for (var i = 0; i < scene.medias.length; i++) {
            var mediaInfo = scene.medias[i];

            slots[mediaInfo.slot] = [];

            for (var m = 0; m < mediaInfo.id.length; m++) {
                slots[mediaInfo.slot].push( this.project.medias[ mediaInfo.id[m] ] );
            }

        }

        return slots;
    }

    this.run = function(projectId){

        this._loadProject(projectId);

        /*this._bindTemplate("simple", {
            'title': ["Hello", "Hi", "Super"],
            'content': ["Lorem ipsum"],
            'event': ['test1', 'test2'],
            'main_media': ["http://via.placeholder.com/35x15/00ff00/", "http://via.placeholder.com/35x15/ffff00/"]
        });*/
    }
}