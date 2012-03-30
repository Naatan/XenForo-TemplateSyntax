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
	 * @type {String}	Tab container css representation
	 */
	var tabContainer = '#editorTabs';
	
	/**
	 * @type {int}	minimum editor height
	 */
	var minHeight = 300;
	
	/**
	 * @type {int}	maximum editor height
	 */
	var maxHeight = 9999;
	
	/**
	 * @type {string}	Cookie used to store height
	 */
	var heightCookie = 'cmheight';
	
	/**
	 * @type {object}	State of the CM instance (cursor position, scroll position, etc)
	 */
	var state = {};
	
	/**
	 * Class constructor
	 * 
	 * @returns	{void}						
	 */
	this.init = function()
	{
		if ($(".propertyCss,.styleProperty").length > 1)
		{
			tabContainer 	= '#propertyTabs';
			minHeight 		= 60;
			maxHeight 		= 200;
			heightCookie 	= 'cmsheight';
			$this.events.bindTabEvents();
			$this.showCodeMirror();
		}
		
		if (window.location.href.substr(-13) == 'templates/add')
		{
			$this.events.bindTabEvents();
			$this.showCodeMirror();
		}
		else
		{
			$this.events.bind();
		}
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
			
			if ($(tabContainer + " a").first().data('events') == undefined || $(tabContainer + " a").first().data('events').click.length == 0)
			{
				return setTimeout($this.events.bindTabEvents,50);
			}
			
			$(tabContainer + " a").each(function()
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
			
			if ( ! $(".CodeMirror").parent().hasClass('section'))
			{
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
			}
			
			$(".CodeMirror").mousedown( $this.events.onClickEditor );
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
		 * Maximize editor on click
		 * 
		 * @param	{Object}		e
		 * 
		 * @returns	{void}						
		 */
		onClickEditor: function(e)
		{
			if (
				tsConfig.features.autoMaximize &&
				! $(this).parent().hasClass('section') &&
				$(".CodeMirror").data("clickMaximize") != false
			)
			{
				$this.maximize();
			}
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
			
			if (h < minHeight) h = minHeight;
			
			$this.setCodeMirrorHeight(h);
		}
	}
	
	/**
	 * Replace the textarea with a codemirror instance
	 * 
	 * @returns	{object}		returns CodeMirror instance
	 */
	this.showCodeMirror = function()
	{
		if ($('.textCtrl.code:visible').val() == null)
		{
			return setTimeout($this.showCodeMirror,100);
		}
		
		if ($(".propertyCss,.styleProperty").length > 1)
		{
			var mode = 'css';
		}
		else
		{
			var mode = $("#editorTabs li.active a").attr("templatetitle").substr(-3) == 'css' ? 'css' : 'text/html';
		}
		
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
			tabSize: parseInt(tsConfig.tabSize),
			indentUnit: parseInt(tsConfig.tabSize),
			keyMap: tsConfig.keymap == null ? 'default' : tsConfig.keymap,
			extraKeys: {},
			onChange: function(editor,data)
			{
				$(".CodeMirror").data("textarea").val(editor.getValue());
			}
		};
		
		if (tsConfig.features.closeTags == "1")
		{
			config.extraKeys["'>'"] = function(cm) { cm.closeTag(cm, '>'); };
			config.extraKeys["'/'"] = function(cm) { cm.closeTag(cm, '/'); };
		}
		
		config.extraKeys[tsConfig.keybinding.save] = $this.save;
		config.extraKeys[tsConfig.keybinding.maximize] = $this.toggleMaximize;
		
		if (tsConfig.features.foldCode)
		{
			config.onGutterClick = CodeMirror.newFoldFunction(CodeMirror.tagRangeFinder);
		}
		
		var elem;
		var CM = CodeMirror(function(elt)
		{
			var textarea = $('.textCtrl.code:visible');
			elem = $(elt);
			
			elem.data('textarea', textarea);
			
			textarea.hide();
			textarea.after(elem);
		}, config);
		
		elem.data('CodeMirror', CM);
		
		$this.setCodeMirrorHeight();
		$this.events.bindCodeMirrorEvents(CM);
		
		var width = $("#templateEditor").width() - 20;
		width = width - parseInt($(".CodeMirror").css("margin-left").replace('px',''));
		width = width - parseInt($(".CodeMirror").css("margin-right").replace('px',''));
		
		$(".CodeMirror").width(width);
		
		CM.refresh();
		
		return CM;
	};
	
	/**
	 * Remove CodeMirror and show the standard textarea
	 * 
	 * @returns	{void}						
	 */
	this.hideCodeMirror = function()
	{
		var elt = $(".CodeMirror");
		
		if (elt.length > 0)
		{
			elt.data('textarea').show();
			elt.remove();
		}
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
	this.setCodeMirrorHeight = function(h, save)
	{
		if (h == undefined)
		{
			h = $.getCookie(heightCookie);
		}
		
		if (h == null || h < minHeight) h = minHeight;
		if (h > maxHeight) h = maxHeight;
		
		$(".CodeMirror-scroll, .CodeMirror-scroll > div:first-child").height(h);
		
		$(".CodeMirror").data("CodeMirror").refresh();
		
		if (save == undefined || save == true)
		{
			$.setCookie(heightCookie, h, new Date((new Date()).getTime() + 604800000));
		}
	};
	
	/**
	 * Toggle maximize the editor
	 * 
	 * @returns	{void}						
	 */
	this.toggleMaximize = function()
	{
		if ($(".CodeMirror").parent().hasClass('section'))
		{
			$this.unMaximize();
			$(".CodeMirror").data("clickMaximize", false);
		}
		else
		{
			$this.maximize();
		}
	};
	
	/**
	 * Maximize CodeMirror instance
	 * 
	 * @returns	{void}						
	 */
	this.maximize = function()
	{
		
		// Create the overlay
		var html = "<div class=section></div>";
		var overlay = XenForo.createOverlay(null, html, {
			
			// On close send editor back to main DOM
			onBeforeClose: function() {
				
				$this.saveState();
				
				$this.hideCodeMirror();
				
				$("#codePlaceHolder").replaceWith($('.textCtrl.code:visible'));
				
				var CM = $this.showCodeMirror();
				CM.focus();
				
				$this.restoreState();
				
			},
			
			onClose: function() {
				overlay.getOverlay().remove();
			}
			
		});
		
		// Show overlay
		overlay.load();
		
		// Resize overlay to be fullscreen
		overlay.getOverlay().css({width: $(window).width() - 100, left: 50, top: 50});
		
		$this.saveState();
		
		$this.hideCodeMirror();
		
		// Move Editor to Overlay
		$('.textCtrl.code:visible').after($("<div id=codePlaceHolder>").css({width: $('.textCtrl.code:visible').width(), height: $('.textCtrl.code:visible').height()}));
		$('.textCtrl.code:visible').appendTo(overlay.getOverlay().find(".section"));
		
		// Restore CM and set cursor position
		var CM = $this.showCodeMirror();
		CM.focus();
		
		$(".CodeMirror").data("overlay", overlay);
		
		// Resize CM to fit overlay size
		$(".CodeMirror").css({width: 'auto', margin: 0, padding: 0});
		$this.setCodeMirrorHeight($(window).height() - 150, false);
		
		$this.restoreState();
		
		$(".OverlayCloser").css({top: -10, right: -10});
	};
	
	/**
	 * Unmaximize the editor
	 * 
	 * @returns	{void}						
	 */
	this.unMaximize = function()
	{
		if ($(".CodeMirror").data("overlay"))
		{
			$(".CodeMirror").data("overlay").close();
		}
	};
	
	/**
	 * Save the current template
	 * 
	 * @returns	{void}						
	 */
	this.save = function()
	{
		$("#saveReloadButton").trigger("click");
	};
	
	/**
	 * Save the current cursor state
	 * 
	 * @returns	{void}						
	 */
	this.saveState = function()
	{
		var CM = $(".CodeMirror").data("CodeMirror");
		
		state.cursor = CM.getCursor();
		state.endCursor = CM.getCursor(false);
	};
	
	/**
	 * Restore the previous cursor state
	 * 
	 * @returns	{void}						
	 */
	this.restoreState = function()
	{
		var CM = $(".CodeMirror").data("CodeMirror");
		
		CM.setCursor(state.cursor);
		
		if (state.cursor.ch != state.endCursor.ch || state.cursor.line != state.endCursor.line)
		{
			CM.setSelection(state.cursor, state.endCursor);
		}
	};
	
	$(document).ready($this.init);
	
};