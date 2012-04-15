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
	 * @type {string|int}	define with of editor
	 */
	var staticWidth = 'auto';
	
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
		
		if (window.location.href.indexOf('templates/add') != -1)
		{
			$this.events.bindTabEvents();
			$this.showCodeMirror();
		}
		else if (window.location.href.indexOf('template-modifications') != -1)
		{
			minHeight 		= 60;
			maxHeight 		= 200;
			staticWidth 	= $("#ctrl_search_value").width();
			heightCookie 	= 'tmsheight';
			$this.showCodeMirror($("#ctrl_search_value"));
			$this.showCodeMirror($("#ctrl_replace_value"));
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
		bindCodeMirrorEvents: function(CM)
		{
			var elem = $(CM.getWrapperElement());
			elem.next('.cmresize').remove();
			
			if ( ! elem.parent().hasClass('section'))
			{
				var cmresize = $("<div class=cmresize>").css({width: '100%', height: '5px', marginTop: '-5px'});
				elem.after(cmresize);
				
				cmresize.unbind('hover');
				cmresize.hover(
					function() { $(this).css('cursor', 's-resize'); },
					function() { $(this).css('cursor', 'auto'); }
				);
				
				cmresize.unbind('mousedown').unbind('mouseup');
				cmresize.mousedown( function(e) { $this.events.onMouseDown.call(this, e, CM); } );
				cmresize.mouseup( function(e) { $this.events.onMouseUp.call(this, e, CM); } );
			}
			
			elem.mousedown( function(e) { $this.events.onClickEditor.call(this, e, CM); } );
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
		onClickEditor: function(e, CM)
		{
			var elem = $(CM.getWrapperElement());
			
			if (
				tsConfig.features.autoMaximize &&
				! $(this).parent().hasClass('section') &&
				elem.data("clickMaximize") != false
			)
			{
				$this.maximize(CM);
			}
		},
		
		/**
		 * Catch onMouseDown event for resizer element, this initiates the resize
		 * 
		 * @returns	{void}						
		 */
		onMouseDown: function(e, CM)
		{
			$(document).unbind('mousemove');
			$(document).mousemove( function(e) { $this.events.onMouseMove.call(this, e, CM); } );
			$(document).mouseup( function(e) { $this.events.onMouseUp.call(this, e, CM); } );
			
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
		onMouseMove: function(e, CM)
		{
			var elem = $(CM.getWrapperElement());
			
			if (resize == false) return;
			
			var pos = elem.offset().top;
			var h = e.pageY - pos;
			
			if (h < minHeight) h = minHeight;
			
			$this.setCodeMirrorHeight(CM, h);
		}
	}
	
	/**
	 * Replace the textarea with a codemirror instance
	 *
	 * @param	{object} 		elem
	 * 
	 * @returns	{object}		returns CodeMirror instance
	 */
	this.showCodeMirror = function(textarea)
	{
		if (textarea === undefined || ! textarea)
		{
			textarea = $("textarea.textCtrl.code:visible");
		}
		
		if (typeof textarea != 'object' || textarea.val() == null)
		{
			return setTimeout($this.showCodeMirror,100);
		}
		
		var mode = $this.getSyntaxMode();
		
		var config = {
			value: 			textarea.val(),
			theme: 			tsConfig.theme,
			mode: 			mode,
			lineNumbers: 	tsConfig.features.lineNumbers == "1" ? true : false,
			lineWrapping: 	tsConfig.features.lineWrapping == "1" ? true : false,
			indentWithTabs: tsConfig.features.indentWithTabs == "1" ? true : false,
			smartIndent: 	tsConfig.features.smartIndent == "1" ? true : false,
			electricChars: 	tsConfig.features.electricChars == "1" ? true : false,
			matchBrackets: 	tsConfig.features.matchBrackets == "1" ? true : false,
			tabSize: 		parseInt(tsConfig.tabSize),
			indentUnit: 	parseInt(tsConfig.tabSize),
			keyMap: 		tsConfig.keymap == null ? 'default' : tsConfig.keymap,
			extraKeys: 		{},
			onChange: 		function(CM,data)
			{
				$(CM.getWrapperElement()).data("textarea").val(CM.getValue());
			}
		};
		
		if (tsConfig.features.closeTags == "1")
		{
			config.extraKeys["'>'"] = function(CM) { CM.closeTag(CM, '>'); };
			config.extraKeys["'/'"] = function(CM) { CM.closeTag(CM, '/'); };
		}
		
		config.extraKeys[tsConfig.keybinding.save] 		= $this.save;
		config.extraKeys[tsConfig.keybinding.maximize] 	= $this.toggleMaximize;
		config.extraKeys[tsConfig.keybinding.zen] 		= $this.zenCoding;
		config.extraKeys[tsConfig.keybinding.format] 	= $this.formatSelection;
		
		if (tsConfig.features.foldCode)
		{
			config.onGutterClick = CodeMirror.newFoldFunction(CodeMirror.tagRangeFinder);
		}
		
		var elem;
		var CM = CodeMirror(function() {}, config);
		
		var elem = $(CM.getWrapperElement());
		
		elem.data('textarea', textarea);
		elem.data('CodeMirror', CM);
		
		textarea.hide();
		textarea.after(elem);
		
		$this.setCodeMirrorHeight(CM);
		$this.events.bindCodeMirrorEvents(CM);
		
		if ($("#templateEditor").length != 0)
		{
			var width = $("#templateEditor").width() - 20;
			width = width - parseInt(elem.css("margin-left").replace('px',''));
			width = width - parseInt(elem.css("margin-right").replace('px',''));
			
			elem.width(width);
		}
		else
		{
			elem.width(staticWidth);
			elem.css("margin-left", 0);
		}
		
		CM.refresh();
		
		return CM;
	};
	
	/**
	 * Remove CodeMirror and show the standard textarea
	 * 
	 * @returns	{void}						
	 */
	this.hideCodeMirror = function(CM)
	{
		if (CM === undefined)
		{
			var elem = $(".CodeMirror");
		}
		else
		{
			var elem = $(CM.getWrapperElement());
		}
		
		if (elem.length > 0)
		{
			elem.data('textarea').show();
			elem.remove();
		}
	};
	
	/**
	 * Set height of the CodeMirror editor
	 *
	 * Sets and falls back on cookies
	 *
	 * @param 	{object}			CM
	 * @param	{int|undefined}		h
	 * @params 	{bool} 				save
	 * @params 	{bool} 				respectMax
	 * 
	 * @returns	{void}						
	 */
	this.setCodeMirrorHeight = function(CM, h, save, respectMax)
	{
		if (h == undefined)
		{
			h = $.getCookie(heightCookie);
		}
		
		if (respectMax === undefined)
		{
			respectMax = true;
		}
		
		if (h == null || h < minHeight) h = minHeight;
		if (respectMax && h > maxHeight) h = maxHeight;
		
		$(CM.getWrapperElement()).find(".CodeMirror-scroll, .CodeMirror-scroll > div:first-child").height(h);
		
		CM.refresh();
		
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
	this.toggleMaximize = function(CM)
	{
		if ($(CM.getWrapperElement()).parent().hasClass('section'))
		{
			$this.unMaximize();
			$(CM.getWrapperElement()).data("clickMaximize", false);
		}
		else
		{
			$this.maximize(CM);
		}
	};
	
	/**
	 * Maximize CodeMirror instance
	 * 
	 * @returns	{void}						
	 */
	this.maximize = function(CM)
	{
		var elem = $(CM.getWrapperElement());
		
		// Create the overlay
		var html = "<div class=section></div>";
		var overlay = XenForo.createOverlay(null, html,
		{
			
			// On close send editor back to main DOM
			onBeforeClose: function()
			{
				
				var elem 		= overlay.getOverlay().find(".CodeMirror");
				var textarea 	= elem.data('textarea');
				var CM   		= elem.data('CodeMirror');
				var placeholder = textarea.data('placeholder');
				
				$this.saveState(CM);
				
				$this.hideCodeMirror(CM);
				
				placeholder.replaceWith(textarea);
				
				var CM = $this.showCodeMirror(textarea);
				CM.focus();
				
				$this.restoreState(CM);
				
			},
			
			onClose: function()
			{
				overlay.getOverlay().remove();
			}
			
		});
		
		// Show overlay
		overlay.load();
		
		// Resize overlay to be fullscreen
		overlay.getOverlay().css({width: $(window).width() - 100, left: 50, top: 50});
		
		$this.saveState(CM);
		
		var textarea = elem.data('textarea');
		
		$this.hideCodeMirror(CM);
		
		// Move Editor to Overlay
		var placeholder = $("<div>").css({width: textarea.width(), height: textarea.height()});
		textarea.data('placeholder', placeholder);
		textarea.after(placeholder);
		textarea.appendTo(overlay.getOverlay().find(".section"));
		
		// Restore CM and set cursor position
		CM = $this.showCodeMirror(textarea);
		CM.focus();
		
		elem = $(CM.getWrapperElement());
		
		elem.data("overlay", overlay);
		
		// Resize CM to fit overlay size
		elem.css({width: 'auto', margin: 0, padding: 0});
		$this.setCodeMirrorHeight(CM, $(window).height() - 150, false, false);
		
		$this.restoreState(CM);
		
		$(".OverlayCloser").css({top: -10, right: -10});
	};
	
	/**
	 * Unmaximize the editor
	 * 
	 * @returns	{void}						
	 */
	this.unMaximize = function(CM)
	{
		if ($(CM.getWrapperElement()).data("overlay"))
		{
			$(CM.getWrapperElement()).data("overlay").close();
		}
	};
	
	/**
	 * Save the current template
	 * 
	 * @returns	{void}						
	 */
	this.save = function(CM)
	{
		if ($(CM.getWrapperElement()).data("overlay"))
		{
			$("#saveReloadButton").before($("<input>").attr({
				id: 'savePlaceHolder',
				type: 'hidden',
				name: $(CM.getWrapperElement()).data("textarea").attr("name"),
				value: $(CM.getWrapperElement()).data("textarea").val()
			}));
		}
		
		$("#saveReloadButton").trigger("click");
		$("#savePlaceHolder").remove();
	};
	
	/**
	 * Save the current cursor state
	 * 
	 * @returns	{void}						
	 */
	this.saveState = function(CM)
	{
		state.cursor = CM.getCursor();
		state.endCursor = CM.getCursor(false);
	};
	
	/**
	 * Restore the previous cursor state
	 * 
	 * @returns	{void}						
	 */
	this.restoreState = function(CM)
	{
		CM.setCursor(state.cursor);
		
		if (state.cursor.ch != state.endCursor.ch || state.cursor.line != state.endCursor.line)
		{
			CM.setSelection(state.cursor, state.endCursor);
		}
	};
	
	/**
	 * Apply Zen Coding to text under cursor
	 * 
	 * @param	{object}		CM				CM instance
	 * 
	 * @returns	{void}						
	 */
	this.zenCoding = function(CM)
	{
		var cursor = CM.getCursor();
		var range = CM.getRange({line: cursor.line, ch: 0}, cursor);
		
		var zen = range.match(/\s*?(\S*$)/);
		if (zen && zen[1] !== undefined && zen[1].length > 0)
		{
			zen_coding.setCaretPlaceholder('');
			var syntax 	= $this.getSyntaxMode();
			var html 	= zen_coding.expandAbbreviation(zen[1], syntax, 'xhtml');
			
			var rangeStart = {line: cursor.line, ch: cursor.ch - zen[1].length}
			CM.replaceRange(html, rangeStart, cursor);
		}
	};
	
	/**
	 * Format the selected text, if no selection is made use the whole document
	 * 
	 * @param	{Object}		CM				CM instance
	 * 
	 * @returns	{void}						
	 */
	this.formatSelection = function(CM)
	{
		var rangeStart = CM.getCursor(true);
		var rangeEnd   = CM.getCursor(false);
		
		if (rangeStart.line == rangeEnd.line && rangeStart.ch == rangeEnd.ch)
		{
			rangeStart = {line: 0, ch: 0};
			rangeEnd   = {line: CM.lineCount()-1, ch: CM.lineInfo(CM.lineCount()-1).text.length};
		}
		
		var selection 	= CM.getRange(rangeStart, rangeEnd);
		var html 		= selection.replace(/\n\n/g, "\n");
		var bits 		= html.split("\n");
		
		CM.replaceRange(html, rangeStart, rangeEnd);
		
		rangeEnd.line = rangeStart.line + (html.match(/\n/g).length - 1);
		rangeEnd.ch = bits[bits.length-1].length;
		
        CM.autoFormatRange(rangeStart, rangeEnd);
	};
	
	/**
	 * Get the syntax mode for the current editor
	 * 
	 * @returns	{string}						css or html
	 */
	this.getSyntaxMode = function()
	{
		if ($(".propertyCss,.styleProperty").length > 1)
		{
			var mode = 'css';
		}
		else if ($("#editorTabs li.active a").length != 0)
		{
			var mode = $("#editorTabs li.active a").attr("templatetitle").substr(-3) == 'css' ? 'css' : 'text/html';
		}
		else if ($("input[name=template_title]").length != 0)
		{
			var mode = $("input[name=template_title]").val().substr(-3) == 'css' ? 'css' : 'text/html';
		}
		else
		{
			var mode = 'html';
		}
		
		return mode;
	};
	
	$(document).ready($this.init);
	
};