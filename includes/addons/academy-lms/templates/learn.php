<?php
/**
 * ZenCommunity native Academy learn page.
 *
 * Served at {community}/learn/{course_id} by Hooks::native_learn_template().
 * A ZenCommunity-owned, chrome-free document that renders Academy LMS's OWN
 * JS-render learning template (curriculum player, progress, quizzes) using
 * Academy's own enqueued assets — no iframe, no theme header/footer, no admin
 * bar. Academy's learn app provides its own top bar (with an "exit" that we
 * point back to the community course page).
 *
 * @package ZenCommunity\Addons\AcademyLms
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<?php wp_head(); ?>
	<style>
		/* This document has no admin bar; undo any theme/WP top offset. */
		html { margin-top: 0 !important; }
		body.zc-academy-learn { margin: 0; }
		/* Hide chrome from other plugins that hook wp_footer (e.g. floating
		   carts) so the learning view stays focused. */
		body.zc-academy-learn .storeengine-side-cart,
		body.zc-academy-learn .storeengine-floating-cart,
		body.zc-academy-learn #wpadminbar { display: none !important; }
	</style>
</head>
<body <?php body_class( 'zc-academy-learn academy-course-single-lessons' ); ?>>
	<?php
	/**
	 * Academy's JS-render learning template. Reads the current course from the
	 * global post (set in Hooks::maybe_render_native_learn) and mounts the
	 * frontendCurriculums React app into #academyLessonsWrap.
	 */
	\Academy\Helper::get_template( 'curriculums/js-render.php' );

	wp_footer();
	?>
</body>
</html>
