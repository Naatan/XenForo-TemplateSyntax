<?php

/**
 * Listener
 */
class TemplateSyntax_Listen
{
	
	static $addExternal = false;
	
	/**
	 * Listen for post render effects so we can append externals to the header in the PAGE_CONTAINER template
	 * 
	 * @param	string						$templateName	
	 * @param	string						$content		
	 * @param	array						array			
	 * @param	XenForo_Template_Abstract	$template
	 * 
	 * @return	void										
	 */
	public static function template_post_render($templateName, &$content, array &$containerData, XenForo_Template_Abstract $template)
	{
		if (self::$addExternal AND $templateName == 'PAGE_CONTAINER')
		{
			$options 	= XenForo_Application::get('options');
			
			$append 	 = '<link rel="stylesheet" href="'.$options->boardUrl.'/js/codemirror/lib/codemirror.css">' . "\n";
			$append 	.= '<link rel="stylesheet" href="'.$options->boardUrl.'/admin.php?_css/&css=templatesyntax">' . "\n";
			
			if ($options->tsTheme != 'default' AND ! empty($options->tsTheme))
			{
				$append .= '<link rel="stylesheet" href="'.$options->boardUrl.'/js/codemirror/theme/'.$options->tsTheme.'.css">' . "\n";
			}
			
			$append 	.= '<script src="'.$options->boardUrl.'/js/codemirror/lib/codemirror.js"></script>' . "\n";
			$append 	.= '<script src="'.$options->boardUrl.'/js/templatesyntax/templatesyntax.js"></script>' . "\n";
			
			$append 	.= '<script src="'.$options->boardUrl.'/js/codemirror/mode/xml/xml.js"></script>' . "\n";
			$append 	.= '<script src="'.$options->boardUrl.'/js/codemirror/mode/javascript/javascript.js"></script>' . "\n";
			$append 	.= '<script src="'.$options->boardUrl.'/js/codemirror/mode/css/css.js"></script>' . "\n";
			$append 	.= '<script src="'.$options->boardUrl.'/js/codemirror/mode/htmlmixed/htmlmixed.js"></script>' . "\n";
			
			if ($options->tsKeyMap != 'default' AND ! empty($options->tsKeyMap))
			{
				$append .= '<script src="'.$options->boardUrl.'/js/codemirror/keymap/'.$options->tsKeyMap.'.js"></script>' . "\n";
			}
			
			if ($options->tsFeatures['matchBrackets'])
			{
				$append .= '<script src="'.$options->boardUrl.'/js/codemirror/lib/util/closetag.js"></script>' . "\n";
			}
			
			if ($options->tsFeatures['foldCode'])
			{
				$append .= '<script src="'.$options->boardUrl.'/js/codemirror/lib/util/foldcode.js"></script>' . "\n";
			}
			
			$config = array(
				'features'	=> $options->tsFeatures,
				'keymap'	=> $options->tsKeyMap,
				'tabSize'	=> $options->tsTabSize,
				'theme'		=> $options->tsTheme
			);
			
			$append 	.= '<script>tsConfig = '.json_encode($config).';</script>' . "\n";
			
			$content 	= str_replace('</head>', $append . '</head>', $content);
			
			self::$addExternal = false;
		}
		
	}
	
	/**
	 * Listen for controller pre dispatch events so we can detect when the externals are required
	 * 
	 * @param	XenForo_Controller	$controller		
	 * @param	string				$action
	 * 
	 * @return	void			
	 */
	public static function controller_pre_dispatch(XenForo_Controller $controller, $action)
	{
		if (
			! $controller instanceof XenForo_ControllerAdmin_AdminTemplate AND
			! $controller instanceof XenForo_ControllerAdmin_Template AND
			! $controller instanceof XenForo_ControllerAdmin_Style AND
			! $controller instanceof XenForo_ControllerAdmin_AdminStyleProperty
		)
		{
			return;
		}
		
		self::$addExternal = true;
	}
	
}