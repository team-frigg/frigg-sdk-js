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

    this._init = function (params) {
        //this.params.templateElement.style.display = "none";
    }(params); //

    

    this._cloneElement = function(elementId) {
        var original = this.params.templateElement.querySelector("#" + elementId);
        var clone = original.cloneNode(true);

        clone.setAttribute("id", "");

        return clone;
    }

    this._bindTemplate = function(templateName, sceneData) {
        var clone = this._cloneElement(this.params.templatePrefix + templateName);

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


        this.params.containerElement.appendChild(clone);
    }

    this.run = function(projectId){
        this._bindTemplate("simple", {
            'title': ["Hello", "Hi"],
            'content': "Lorem ipsum",
            'main_media': "http://via.placeholder.com/30x30"
        });
    }
}