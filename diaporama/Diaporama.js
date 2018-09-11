
var Diaporama = function(options){

	this.options = {
		onChange: function(event){},
		onSmall: function(event){},

		forceItemWidthPercent: undefined, 
		updateOnResize: true,

		autoPlayIntervalMs: 2000,
		
		mouseDragSpeedMultiplier: -0.9,
		touchDragSpeedMultiplier: -0.9,
		
		enableDrag: false,
		enableMouseDrag: true,
		enableTouchDrag: true,

		limitDragViewport: true,
		lastItemSnapRight:false,

		selectedItemClassToAdd: "selected",

		containerElement: document,
		viewportSelector: ".diapo-viewport",
		ribbonSelector: ".diapo-ribbon",
		itemSelector: ".diapo-item",
	};

	this.mergeObject(this.options, options);

	this.viewport = this.options.containerElement.querySelector(this.options.viewportSelector);
	this.ribbon = this.viewport.querySelector(this.options.ribbonSelector);
	this.children = this.ribbon.querySelectorAll(this.options.itemSelector);

	this.currentPosition = 0;
	this.positions = [];

	//current state
	this.disableClick = false;
	this.disableFocus = false;
	this.smallRibbon = false;

	this.init();
	this.initClickEvents();
	this.initDragEvents();
	this.initAutoPlay();

}

Diaporama.prototype.mergeObject = function(objectA, objectB){

	if (! objectA || ! objectB) {
		return;
	}

	for(var key in objectB) {
		objectA[key] = objectB[key];
	}

}

Diaporama.prototype.triggerEvent = function(element, eventName){
	if (! this.options[eventName]) {
		return;
	}

	var eventData = {
		selectedItemIndex: element.getAttribute("position"),
		selectedItem: element
	};
	
	//console.log("Trigger event " + eventName );
	this.options[eventName](eventData);
}

Diaporama.prototype.init = function(){
	this.updateSizes();

	var resizeEnd;

	if (this.options.updateOnResize) {
		var self = this;
		window.addEventListener("resize", function(){
			self.updateSizes();
			
			clearTimeout(resizeEnd);
  			resizeEnd = setTimeout(function(){
  				self.currentPosition = 0;
  				self.update();
  			}, 100);
		});
	}

	this.updateSelectedElement();
}

Diaporama.prototype.activateSelectedElement = function(){
	var selectedElement = this.children[ this.currentPosition ];
	this.triggerEvent(selectedElement, "onClick");
}

Diaporama.prototype.initClickEvents = function(){
	var self = this;
	var sap = {ui:{keycodes:{SPACE:32, ENTER:13 }}};
	
	var index = 0;
	
	self.initViewportEvents();

	for(var i=0; i < this.children.length; i++){

		var child = this.children[i];
		this.addAriaAttributes(child);
		
		child.setAttribute("position", i);
		
		child.addEventListener("keyup", function(event){
			
			if (event.keyCode == sap.ui.keycodes.SPACE || event.keyCode == sap.ui.keycodes.ENTER) {
		      	self.triggerEvent(event.target, "onClick");
		    } 

		});	

		child.addEventListener("click", function(event){
			
			if (self.disableClick){
				//console.log("CLICKED but disabled");	
				return;
			}

			self.triggerEvent(event.target, "onClick");
		});

		/*child.addEventListener("focus", function(event){
			if (self.disableFocus){
				//console.log("FOCUSED but disabled");	
				return;
			}

			//console.log("FOCUSED");	
			var index = this.getAttribute("position");
			
			self.currentPosition = index;
			self.update();
		});*/
	}

	

}

Diaporama.prototype.initViewportEvents = function(){
	var self = this;
	this.viewport.addEventListener("keyup", function(event){
		if (event.key == "ArrowLeft") {
			self.movePrevious();
			return;
		}

		if (event.key == "ArrowRight") {
			self.moveNext();
			return;
		}

		/*if (event.key == "Tab" && event.shiftKey ) {
			self.movePrevious();
			return;
		}

		if (event.key == "Tab") {
			self.moveNext();
			return;
		}*/

		if (event.key == "Space" || event.key == "Enter" ) {
			self.activateSelectedElement();
			return;
		}



	});
}

Diaporama.prototype.addAriaAttributes = function(item){
	item.setAttribute("role","link");
	item.setAttribute("tabindex","-1");
}

Diaporama.prototype.updateSizes = function(){
	var forceItemWidth = undefined;
	var total = 0;

	if (this.options.forceItemWidthPercent) {
		var refSize = this.viewport.offsetWidth;

		var percent = 0;
		if (typeof this.options.forceItemWidthPercent === "function"){
			percent = this.options.forceItemWidthPercent(refSize);
		} else {
			percent = this.options.forceItemWidthPercent;
		}

		forceItemWidth =  percent * refSize / 100 ;
	}

	for(var i=0; i < this.children.length; i++){
		var child = this.children[i];

		if (forceItemWidth){
			child.style.width = forceItemWidth + "px";
		}

		var current = forceItemWidth ? forceItemWidth : child.offsetWidth;

		this.positions[i] = total;
		total += current;
	}

	//console.log( "total : " + total);
	this.ribbon.style.width = Math.ceil(total) + "px";

	var viewportWidth = this.viewport.offsetWidth;
	var ribbonWidth = this.ribbon.offsetWidth;

	if (ribbonWidth <= viewportWidth) {
		//console.log("Ribbon smaller than viewport.");
		this.smallRibbon = true;
		this.options.onSmall();
	}
}

Diaporama.prototype.moveNextOrFirst = function(){
	this.clearSelectedElement();
	this.currentPosition++;

	if (this.currentPosition > this.children.length -1){
		this.currentPosition = 0;
	}

	this.update();
	this.updateSelectedElement();
}


Diaporama.prototype.moveNext = function(){
	this.clearSelectedElement();
	this.currentPosition++;
	this.update();
	this.updateSelectedElement();
}

Diaporama.prototype.movePrevious = function(){
	this.clearSelectedElement();
	
	this.currentPosition--;
	this.update();
	this.updateSelectedElement();
}

Diaporama.prototype.boundCurrentPosition = function(){
	if (this.currentPosition < 0){
		this.currentPosition = 0;
	}

	if (this.currentPosition >= this.children.length){
		this.currentPosition = this.children.length-1;
	}
}

Diaporama.prototype.clearSelectedElement = function(){
	var selectedElement = this.children[this.currentPosition];
	selectedElement.classList.remove( this.options.selectedItemClassToAdd );
	//selectedElement.blur();
}

Diaporama.prototype.updateSelectedElement = function(){
	var selectedElement = this.children[this.currentPosition];
	selectedElement.classList.add( this.options.selectedItemClassToAdd );
	//selectedElement.focus();
}

Diaporama.prototype.update = function(){
	//console.log("UPDATE");
	if (this.smallRibbon){
		return;
	}

	this.boundCurrentPosition();

	var newPosition = -1 * this.positions[this.currentPosition];

	if (this.options.lastItemSnapRight ) {
		newPosition = this.limitNewPosition(newPosition);
	}

	var selectedElement = this.children[this.currentPosition];
	
	this.ribbon.style.marginLeft = newPosition + 'px';	
	this.triggerEvent(selectedElement, "onChange");
}

Diaporama.prototype.limitNewPosition = function(newPosition){
	//console.log("LIMIT POS");
	if (newPosition > 0) {
		return 0;
	}

	var viewportWidth = this.viewport.offsetWidth;
	var ribbonWidth = this.ribbon.offsetWidth;

	if (Math.abs(newPosition) + viewportWidth > ribbonWidth) {
		newPosition = -1 * (ribbonWidth - viewportWidth);
	}

	return newPosition;
}

Diaporama.prototype.initDragEvents = function(){

	if (! this.options.enableDrag){
		return;
	}

	if (this.smallRibbon) {
		//console.log("Ribbon smaller than viewport : drag disabled");
		return;
	}

	var self = this;
	var referencePosition = 0;
	var startPosition = 0;
	
	var onStart = function(event) {
		//console.log("Started");
		
		if (event.touches) {
			event = event.touches[0];
		}
		
		referencePosition = event.clientX;
		startPosition= referencePosition;

		self.addDragListener("move", onMove);
		self.addDragListener("release", onRelease);
		
		self.ribbon.classList.add("notransition");
		self.disableClick = false;
		self.disableFocus = true;
	};

	var onMove = function(event) {
		self.disableClick = true;
		var speedMultiplier = self.options.mouseDragSpeedMultiplier;

		if (event.touches) {
			event = event.touches[0];
			speedMultiplier = self.options.touchDragSpeedMultiplier;
		}

		var delta = referencePosition - event.clientX;
		delta *= speedMultiplier;

		var currentX = parseInt(self.ribbon.style.marginLeft);
		
		if ( isNaN(currentX) ) {
			currentX = 0;
		}
		
		var newPosition = currentX + delta;
		
		if (self.options.limitDragViewport){
			newPosition = self.limitNewPosition(newPosition);
		}

		/*//console.log(
			"Event : " + event.clientX 
			+ ", delta : " + delta 
			+ ", currentX : " + currentX 
			+ ", newPosition : " + newPosition );*/
	
		self.ribbon.style.marginLeft = newPosition + 'px';
		referencePosition = event.clientX;
	};

	var onRelease = function(event) {
		console.log(event);

		if (event.touches && event.touches.length > 0) {
			event = event.touches[0];
		}

		if (event.changedTouches && event.changedTouches.length > 0) {
			event = event.changedTouches[0];
		}

		var finalPosition = event.clientX;
		var delta = finalPosition - startPosition;
		var direction = delta > 0 ? 1 : -1;

		console.log("Ended in direction : " + direction);
		console.log(" with delta : " + delta);

		self.removeDragListener("move", onMove);
		self.removeDragListener("release", onRelease);

		var deltaThreshold = 10;
		if (Math.abs(delta) < deltaThreshold) {
			return;
		} 

		//snap to ///
		var currentX = parseInt(self.ribbon.style.marginLeft);
		var snapToChild = self.findNearestItem(direction);
		
		self.clearSelectedElement();

		self.currentPosition = snapToChild;
		self.update();

		self.updateSelectedElement();

		self.disableFocus = false;
		self.ribbon.classList.remove("notransition");
	};

	self.addDragListener("start", onStart);
	
}

Diaporama.prototype.dragPhases = {
	"start" 	: {"mouse":"mousedown", "touch":"touchstart"},
	"move" 		: {"mouse":"mousemove", "touch":"touchmove"},
	"release" 	: {"mouse":"mouseup", "touch":"touchend"},		
};

Diaporama.prototype.addDragListener = function(phaseName, callback){
	if (this.options.enableMouseDrag) {
		var target = (phaseName=="start") ? this.ribbon : document;
		target.addEventListener(this.dragPhases[phaseName]['mouse'], callback);	

		////console.log("ADD LISTENER " + phaseName + " to " + target);
	}
	
	if (this.options.enableTouchDrag) {
		this.ribbon.addEventListener(this.dragPhases[phaseName]['touch'], callback);
	}
}


Diaporama.prototype.removeDragListener = function(phaseName, callback){
	if (this.options.enableMouseDrag) {
		var target = (phaseName=="start") ? this.ribbon : document;
		target.removeEventListener(this.dragPhases[phaseName]['mouse'], callback);	

		////console.log("RM LISTENER " + phaseName + " from " + target);
	}
	
	if (this.options.enableTouchDrag) {
		this.ribbon.removeEventListener(this.dragPhases[phaseName]['touch'], callback);
	}
}


Diaporama.prototype.findNearestItem = function(direction){
	var currentX = parseInt(this.ribbon.style.marginLeft);
	
	if (currentX > 0) {
		return 0;
	}

	currentX = Math.abs(currentX);

	var lowestDelta=99999;
	var snapToChild = -1;

	for (var i = 0; i < this.positions.length; i++) {
		var position = this.positions[i];
		var delta = currentX - position;

		//console.log("Delta for child " + i + " : " + delta);

		if ( ! this.numberSameSign(delta, direction) ){
			continue;
		}

		delta = Math.abs(delta);

		if (delta < lowestDelta){
			lowestDelta = delta;
			snapToChild = i;
		}
	};
	
	return snapToChild;
}


Diaporama.prototype.numberSameSign = function(firstNumber, secondNumber){
	if (firstNumber>0 && secondNumber>0){
		return true;
	}

	if (firstNumber<0 && secondNumber<0){
		return true;
	}

	if (firstNumber==0 && secondNumber==0){
		return true;
	}

	return false;
}

Diaporama.prototype.initAutoPlay = function(){
	if (this.options.autoPlayIntervalMs <= 0){
		return;
	}

	if (this.smallRibbon) {
		return;
	}

	if (this.children.length <= 1){
		return;
	}

	this.autoPlayInterval = window.setInterval(function(){
		console.log("autoplay");
		this.moveNextOrFirst();
	}.bind(this), this.options.autoPlayIntervalMs);

}

