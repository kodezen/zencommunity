<?php
namespace ZenCommunity\Addons\Email\Api\Schema;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use stdClass;
trait TemplateSchema {

	public function schema( bool $msg_required = false ): array {
		return apply_filters( 'zencommunity-pro/email/template/schema', [
			'status' => [
				'description'       => __( 'Status ', 'zencommunity' ),
				'type'              => 'string',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
			],
			'subject' => [
				'description'       => __( 'Subject ', 'zencommunity' ),
				'type'              => 'string',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
			],
			'heading' => [
				'description'       => __( 'Heading ', 'zencommunity' ),
				'type'              => 'string',
				'required'          => false,
				'sanitize_callback' => 'sanitize_text_field',
			],
			'template' => [
				'description'       => __( 'Template content', 'zencommunity' ),
				'type'              => 'string',
				'required'          => $msg_required,
				'sanitize_callback' => 'wp_kses_post',
			],
		] );
	}
	
	public function settings_schema() : array {
		return apply_filters( 'zencommunity-pro/email/template/settings/schema', [
			'from' => [
				'type'        => 'object',
				'required'    => true,
				'description' => __( 'From', 'zencommunity' ),
				'properties'  => [
					'email' => [
						'type'        => 'string',
						'description' => __( 'From email.', 'zencommunity' ),
					],
					'name'  => [
						'type'        => 'string',
						'description' => __( 'From name.', 'zencommunity' ),
					],
				],
				'required_properties' => [ 'email', 'name' ],
				'default'             => new stdClass(),
			],
			'footer_text' => [
				'description'       => __( 'Footer text', 'zencommunity' ),
				'type'              => 'string',
				'required'          => true,
				'sanitize_callback' => 'wp_kses_post',
			],
		] );
	}

}
