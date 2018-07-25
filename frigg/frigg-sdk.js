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

    this.params = {
        'templatePrefix' : "tpl_",
        'containerElement' : document.getElementById("friggContainer"),
        'templateElement' : document.getElementById("friggTemplates"),

        'slotHandler' : {
            'frigg-slot-html' : function(element, media) {
                element.innerHTML = media;
            },
            'frigg-slot-bg' : function(element, media) {
                element.style.backgroundImage = "url(" + media + ")";
            },
            'frigg-slot-srcAlt' : function(element, media) {
                element.setAttribute("src", media); //media.content
                element.setAttribute("alt", media); //media.desc
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

        console.log(elementToBind);
        console.log("Bind element at index " + index);
        console.log(elementSlots);

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

            this.params.slotHandler[slot](elementToBind, value);
        }

    }

    this._bindTemplate = function(templateName, sceneData) {
        var clone = this._cloneElement(this.params.templatePrefix + templateName);

        var selector = "[" + this.allAttributes.join("],[") + "]";

        var slotElements = clone.querySelectorAll(selector);
        
        for (var i = 0; i < slotElements.length; i++) {
            var slotElement = slotElements[i];
            this._bindElement(slotElement, sceneData);
        }

        this.params.containerElement.appendChild(clone);

    }

    this.run = function(projectId){
        this._bindTemplate("simple", {
            'title': ["Hello", "Hi", "Super"],
            'content': ["Lorem ipsum"],
            'event': ['test1', 'test2'],
            'main_media': ["http://via.placeholder.com/35x15/00ff00/", "http://via.placeholder.com/35x15/ffff00/"]
        });
    }
}