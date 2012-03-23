/**
 * TemplateSyntax "class", takes care of replacing the textarea with CodeMirror instances
 * 
 * @returns	{void}						
 */
TemplateSyntax = new function()
{
	
	/**
	 * @type {object}	instance pointer
	 */
	var $this = this;
	
	/**
	 * @type {object}	Storage for XF's clickevents, as we'll need to prioritize our own and fire these manually
	 */
	var clickEvents = {};
	
	/**
	 * @type {bool}	Wether or not we are resizing
	 */
	var resize = false;
	
	/**
	 * @type {null|object}	Variable that stores the stylesheet that's temporarily used to make text unselectable
	 */
	var unselectStyle = null;
	
	/**
	 * Class constructor
	 * 
	 * @returns	{void}						
	 */
	this.init = function()
	{
		$this.events.bind();
	};
	
	/**
	 * Events
	 *
	 * @type {Object}	Gather all event related methods under one object
	 */
	this.events = 
	{
		/**
		 * Bind events on page load
		 * 
		 * @returns	{void}			
		 */
		bind: function()
		{
			$(document).ajaxSuccess( $this.events.onAjaxSuccess )
		},
		
		/**
		 * Bind events to tabs
		 * 
		 * @returns	{void}						
		 */
		bindTabEvents: function()
		{
			var x = 0;
			if (clickEvents[x] != undefined) return;
			
			if ($("#editorTabs a").first().data('events').click.length == 0)
			{
				setTimeout($this.events.bindTabEvents,50);
			}
			
			$("#editorTabs a").each(function()
			{
				$(this).data('tabId', x);
				
				clickEvents[x] = [];
				for (var y=0;y<$(this).data('events').click.length;y++)
				{
					clickEvents[x].push($(this).data('events').click[y].handler);
				}
				
				$(this).unbind('click');
				$(this).bind('click', $this.events.onClickTab);
				x++;
			});
		},
		
		/**
		 * Bind events specific to the CodeMirror instance
		 * 
		 * @returns	{void}						
		 */
		bindCodeMirrorEvents: function()
		{
			$("#cmresize").remove();
			$(".CodeMirror").after($("<div id=cmresize>").css({width: '100%', height: '5px', marginTop: '-5px'}));
			var elem = $("#cmresize");
			
			elem.unbind('hover');
			elem.hover(
				function() { $(this).css('cursor', 's-resize'); },
				function() { $(this).css('cursor', 'auto'); }
			);
			
			elem.unbind('mousedown').unbind('mouseup');
			elem.mousedown( $this.events.onMouseDown );
			elem.mouseup( $this.events.onMouseUp );
		},
		
		/**
		 * ajaxSuccess jQuery event, captured so we can load CodeMirror once the templates have been loaded
		 * 
		 * @param	{Object}		event			
		 * @param	{Object}		XMLHttpRequest	
		 * @param	{Object}		ajaxOptions
		 * 
		 * @returns	{void}			
		 */
		onAjaxSuccess: function(event, XMLHttpRequest, ajaxOptions)
		{
			if (ajaxOptions.url.indexOf('templates/load') != -1)
			{
				$this.events.bindTabEvents();
				$this.showCodeMirror();
			}
		},
		
		/**
		 * Event triggered when a tab is clicked
		 *
		 * We'll need to remove the CodeMirror instance and revert back to the normal textarea, so that XF's JS doesn't freak out
		 * 
		 * @param	{Object}		e
		 * 
		 * @returns	{bool}		
		 */
		onClickTab: function(e)
		{
			$this.hideCodeMirror();
			
			for (var i=0;i<clickEvents[$(this).data('tabId')].length;i++)
			{
				clickEvents[$(this).data('tabId')][i].call(this,e);
			}
			
			setTimeout($this.showCodeMirror,50);
			
			e.preventDefault();
			return false;
		},
		
		/**
		 * Catch onMouseDown event for resizer element, this initiates the resize
		 * 
		 * @returns	{void}						
		 */
		onMouseDown: function()
		{
			$(document).unbind('mousemove');
			$(document).mousemove( $this.events.onMouseMove );
			$(document).mouseup( $this.events.onMouseUp );
			
			unselectStyle = $("<style type=text/css>");
			unselectStyle.html("* { -moz-user-select: none; -webkit-user-select: none; user-select: none; -ms-user-select: none; }");
			unselectStyle.appendTo("body");
			resize = true;
		},
		
		/**
		 * Mouseup event, stop resizing
		 * 
		 * @returns	{void}						
		 */
		onMouseUp: function()
		{
			$(document).unbind('mousemove');
			$(unselectStyle).remove();
			resize = false;
		},
		
		/**
		 * Mousemove event, resize CodeMirror (if resize flag is set)
		 * 
		 * @param	{Object}		event
		 * 
		 * @returns	{void}						
		 */
		onMouseMove: function(event)
		{
			if (resize == false) return;
			
			var pos = $(".CodeMirror").offset().top;
			var h = event.pageY - pos;
			
			if (h < 300) h = 300;
			
			$this.setCodeMirrorHeight(h);
		}
	}
	
	/**
	 * Replace the textarea with a codemirror instance
	 * 
	 * @returns	{void}						
	 */
	this.showCodeMirror = function()
	{
		if ($('.textCtrl.code:visible').val() == null)
		{
			setTimeout($this.showCodeMirror,100);
		}
		
		var mode = $("#editorTabs li.active a").attr("templatetitle").substr(-3) == 'css' ? 'css' : 'text/html';
		
		var config = {
			value: $('.textCtrl.code:visible').val(),
			theme: tsConfig.theme,
			mode: mode,
			lineNumbers: tsConfig.features.lineNumbers == "1" ? true : false,
			lineWrapping: tsConfig.features.lineWrapping == "1" ? true : false,
			indentWithTabs: tsConfig.features.indentWithTabs == "1" ? true : false,
			smartIndent: tsConfig.features.smartIndent == "1" ? true : false,
			electricChars: tsConfig.features.electricChars == "1" ? true : false,
			matchBrackets: tsConfig.features.matchBrackets == "1" ? true : false,
			tabSize: tsConfig.tabSize,
			indentUnit: tsConfig.tabSize,
			keyMap: tsConfig.keymap == null ? 'default' : tsConfig.keymap,
			onChange: function(editor,data)
			{
				$(".CodeMirror").data("textarea").val(editor.getValue());
			}
		};
		
		if (tsConfig.features.closeTags == "1")
		{
			config.extraKeys = {
				"'>'": function(cm) { cm.closeTag(cm, '>'); },
				"'/'": function(cm) { cm.closeTag(cm, '/'); }
			};
		}
		
		if (tsConfig.features.foldCode)
		{
			config.onGutterClick = CodeMirror.newFoldFunction(CodeMirror.tagRangeFinder);
		}
		
		var CM = CodeMirror(function(elt)
		{
			var textarea = $('.textCtrl.code:visible');
			var elt = $(elt);
			
			elt.data('textarea', textarea);
			
			textarea.hide();
			textarea.after(elt);
		}, config);
		
		$this.setCodeMirrorHeight();
		$this.events.bindCodeMirrorEvents(CM);
	};
	
	/**
	 * Remove CodeMirror and show the standard textarea
	 * 
	 * @returns	{void}						
	 */
	this.hideCodeMirror = function()
	{
		var elt = $(".CodeMirror");
		elt.data('textarea').show();
		elt.remove();
	};
	
	/**
	 * Set height of the CodeMirror editor
	 *
	 * Sets and falls back on cookies
	 * 
	 * @param	{int|undefined}		h
	 * 
	 * @returns	{void}						
	 */
	this.setCodeMirrorHeight = function(h)
	{
		if (h == undefined)
		{
			h = $.getCookie('cmheight');
		}
		
		if (h == null) h = 350;
		
		$(".CodeMirror-scroll, .CodeMirror-scroll > div:first-child").height(h);
		
		$.setCookie('cmheight', h, new Date((new Date()).getTime() + 604800000));
	};
	
	$(document).ready($this.init);
	
};