<?php
namespace ZenCommunity\Classes\Addon;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class Base {
	/**
	 * The Parent Addon KEY[s].
     * @var string
	 */
	public array $parent_addon_keys = [];

	/**
	 * The addon name.
     * @var string
	 */
	public ?string $name = null;

	/**
	 * The addon icon source.
     * @var string
	 */
	public ?string $icon_src = null;

	/**
	 * The addon version.
     * @var string
	 */
	public ?string $version = null;

	/**
	 * The addon description.
     * @var string
	 */
	public ?string $description = null;

	/**
	 * Optional deep link to this addon's own settings screen, used instead of
	 * the generic Add-ons tab when set.
     * @var string
	 */
	public ?string $settings_url = null;

	/**
	 * Run when addon is activated.
	 */
	public function activate() : void {}

	/**
	 * Run when addon is deactivated.
	 */
	public function deactivate() : void {}

	/**
	 * Bootstrap addon logic.
	 */
	abstract public function boot() : void;
}
