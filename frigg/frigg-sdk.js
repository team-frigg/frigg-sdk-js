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

        for (var a = 0; a < this.allAttributes.length; a++) {
            var attribute = this.allAttributes[a];
            var value = slotElement.getAttribute(attribute);

            if (!value) {
                continue;
            }

            var mediaValue = sceneData[value];
            this.params.slotHandler[attribute](slotElement, mediaValue);
        }
    }

    this._bindTemplate = function(templateName, sceneData) {
        var clone = this._cloneElement(this.params.templatePrefix + templateName);

        var selector = "[" + this.allAttributes.join("],[") + "]";

        var slotElements = clone.querySelectorAll(selector);
        
        console.log(slotElements);
        for (var i = 0; i < slotElements.length; i++) {
            var slotElement = slotElements[i];
            this._bindElement(slotElement, sceneData);
        }

        this.params.containerElement.appendChild(clone);
/*
        for(var key in this.params.slotHandler){
            var slotElements = clone.querySelectorAll("["+key+"]");
            
            for (var i = 0; i < slotElements.length; i++) {
                var slotElement = slotElements[i];
                var mediaKey = slotElement.getAttribute(key);

                var mediaData = sceneData[mediaKey];

                if (Array.isArray(mediaData)){

                    var futureParent = slotElement.parentNode;

                    //handle source
                    this.params.slotHandler[key](slotElement, mediaData[0]);

                    for (var i = 1; i < mediaData.length; i++) {
                        var innerClone = slotElement.cloneNode(true);
                        this.params.slotHandler[key](innerClone, mediaData[i]);
                        futureParent.appendChild(innerClone);
                    }

                    

                } else {
                    this.params.slotHandler[key](slotElement, mediaData);
                }

                

            }

        }


        */
    }

    this.run = function(projectId){
        this._bindTemplate("simple", {
            'title': ["Hello", "Hi"],
            'content': "Lorem ipsum",
            'main_media': "http://via.placeholder.com/30x30"
        });
    }
}