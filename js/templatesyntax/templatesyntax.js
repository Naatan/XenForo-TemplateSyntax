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
		
		CodeMirror(function(elt)
		{
			var textarea = $('.textCtrl.code:visible');
			var elt = $(elt);
			
			elt.data('textarea', textarea);
			
			textarea.hide();
			textarea.after(elt);
		},
		{
			value: $('.textCtrl.code:visible').val(),
			mode: mode,
			lineNumbers: true,
			lineWrapping: true,
			indentWithTabs: true,
			tabSize: 2,
			indentUnit: 2,
			onChange: function(editor,data)
			{
				$(".CodeMirror").data("textarea").val(editor.getValue());
			},
			extraKeys: {
				"'>'": function(cm) { cm.closeTag(cm, '>'); },
				"'/'": function(cm) { cm.closeTag(cm, '/'); }
			}
		});
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
	
	$(document).ready($this.init);
	
};