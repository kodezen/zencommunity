<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
	<head>
		<meta charset="<?php bloginfo( 'charset' ); ?>" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title><?php echo esc_html__( 'ZenCommunity Setup', 'zencommunity' ); ?></title>
		<?php do_action( 'admin_print_styles' ); ?>
	</head>
	<body>
		<div id="ZenCommunitySettingsElement" class="zencommunity-settings-element"></div>
		<?php do_action( 'admin_print_footer_scripts' ); ?>
	</body>
</html>
