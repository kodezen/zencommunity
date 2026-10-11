<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use ZenCommunity\Helper;
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <title><?php echo esc_html(Helper::get_setting( 'name', __('ZenCommunity', 'zencommunity') )); ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body>
    
    <?php
    /*
     * A landmark, and a height to hold.
     *
     * React mounts into this element after the bundle and the first answers
     * arrive; until then it is empty, and on a slow connection everything below
     * it moves when the app appears. `main` because a page whose entire content
     * is injected here otherwise offers no landmark to anyone navigating by
     * them.
     */
    ?>
    <main id="ZenCommunityAppElement" class="zencommunity-app-element" style="min-height: 100vh;"></main>

    <?php wp_footer(); ?>
</body>
</html>