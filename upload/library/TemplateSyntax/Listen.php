<?php

/**
 * Listener
 *
 */
class TemplateSyntax_Listen
{

	public static $addExternal 	= false;

	/**
	 * Listen for post render effects so we can append externals to the header in the
	 * PAGE_CONTAINER template
	 *
	 * @param	string						$templateName	
	 * @param	string						$content		
	 * @param	array						array			
	 * @param	XenForo_Template_Abstract	$template
	 *
	 * @return	void										
	 *
	 */
	public static function template_post_render($templateName, &$content, array &$containerData, XenForo_Template_Abstract $template)
	{
		if (self::$addExternal AND $templateName == 'PAGE_CONTAINER')
		{
			$params 	 = $template->getParams();
			$baseUrl 	 = $params['requestPaths']['fullBasePath'];
			
			$addonModel	 = new XenForo_Model_AddOn;
			$version  	 = $addonModel->getAddOnVersion('TemplateSyntax');
			$version 	 = $version['version_id'];
			
			$options 	 = XenForo_Application::get('options');
			
			$append 	 = '<link rel="stylesheet" href="'.$baseUrl.'js/codemirror/lib/codemirror.css?v='.$version.'">' . "\n";
			$append 	.= '<link rel="stylesheet" href="'.$baseUrl.'js/codemirror/lib/util/dialog.css?v='.$version.'">' . "\n";
			$append 	.= '<link rel="stylesheet" href="'.$baseUrl.'admin.php?_css/&css=templatesyntax&v='.$version.'">' . "\n";
			
			if ($options->tsTheme != 'default' AND ! empty($options->tsTheme))
			{
				$append .= '<link rel="stylesheet" href="'.$baseUrl.'js/codemirror/theme/'.$options->tsTheme.'.css?v='.$version.'">' . "\n";
			}
			
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/lib/codemirror.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/templatesyntax/templatesyntax.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/templatesyntax/zen.min.js?v='.$version.'"></script>' . "\n";
			
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/mode/xml/xml.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/mode/javascript/javascript.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/mode/css/css.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/mode/htmlmixed/htmlmixed.js?v='.$version.'"></script>' . "\n";
			
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/lib/util/formatting.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/lib/util/search.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/lib/util/searchcursor.js?v='.$version.'"></script>' . "\n";
			$append 	.= '<script src="'.$baseUrl.'js/codemirror/lib/util/dialog.js?v='.$version.'"></script>' . "\n";
			
			if ($options->tsKeyMap != 'default' AND ! empty($options->tsKeyMap))
			{
				$append .= '<script src="'.$baseUrl.'js/codemirror/keymap/'.$options->tsKeyMap.'.js?v='.$version.'"></script>' . "\n";
			}
			
			if (isset($options->tsFeatures['matchBrackets']))
			{
				$append .= '<script src="'.$baseUrl.'js/codemirror/lib/util/closetag.js?v='.$version.'"></script>' . "\n";
			}
			
			if (isset($options->tsFeatures['foldCode']))
			{
				$append .= '<script src="'.$baseUrl.'js/codemirror/lib/util/foldcode.js?v='.$version.'"></script>' . "\n";
			}
			
			
			$config = array(
				'features'	=> $options->tsFeatures,
				'keymap'	=> $options->tsKeyMap,
				'tabSize'	=> $options->tsTabSize,
				'theme'		=> $options->tsTheme,
				'keybinding'=> array(
					'maximize' 	=> $options->tsMaximizeKeybinding,
					'save' 		=> $options->tsSaveKeybinding,
					'zen' 		=> $options->tsZenKeyBinding,
					'format'	=> $options->tsFormatKeyBinding,
				)
			);
			
			$append 	.= '<script>tsConfig = '.json_encode($config).';</script>' . "\n";
			
			$content 	= str_replace('</head>', $append . '</head>', $content);
			
			self::$addExternal = false;
		}
		
	}

	/**
	 * Listen for controller pre dispatch events so we can detect when the externals
	 * are required
	 *
	 * @param	XenForo_Controller	$controller		
	 * @param	string				$action
	 *
	 * @return	void			
	 *
	 */
	public static function controller_pre_dispatch(XenForo_Controller $controller, $action)
	{
		if (
			(
				(
					$controller instanceof XenForo_ControllerAdmin_AdminTemplate OR
					$controller instanceof XenForo_ControllerAdmin_Template OR
					$controller instanceof XenForo_ControllerAdmin_Style 
				)
				AND
				in_array($action, array('Add', 'Edit'))
			)
			OR
			(
				class_exists('TMS_ControllerAdmin_Modification', false) AND
				$controller instanceof TMS_ControllerAdmin_Modification
			)
		)
		{
			self::$addExternal = true;
		}
	}

	public static function front_controller_pre_view(XenForo_FrontController $fc, XenForo_ControllerResponse_Abstract &$controllerResponse, XenForo_ViewRenderer_Abstract &$viewRenderer, array &$containerParams)
	{
		if (defined('TS_DISABLE'))
		{
			self::$addExternal = false;
		}
	}

}