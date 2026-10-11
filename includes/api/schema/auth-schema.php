<?php
namespace ZenCommunity\Api\Schema;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
trait AuthSchema  {

    public function signin_schema() : array {
        return [
            'user' => [
                'required' => true,
                'type' => 'string',
                'description' => __( 'Username or email', 'zencommunity' ),
            ],
            'password' => [
                'required' => true,
                'type' => 'string',
                'description' => __( 'User password', 'zencommunity' ),
            ],
            'remember_me' => [
                'required'          => false,
                'type'              => 'boolean',
                'description'       => __( 'Whether to keep the user logged in across sessions.', 'zencommunity' ),
                'default'           => true,
                'sanitize_callback' => 'rest_sanitize_boolean',
                'validate_callback' => 'rest_validate_request_arg',
            ],
        ];
    }

    public function signup_schema() : array {
        return [
            'username' => [
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Desired username for the new account.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_user',
                'validate_callback' => function ( $param ) {
                    // Username is optional.
                    if ( empty( $param ) ) {
                        return true;
                    }

                    return is_string( $param ) && strlen( $param ) >= 4;
                },
            ],
            'email' => [
                'required'          => true,
                'type'              => 'string',
                'description'       => __( 'Valid email address of the user.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_email',
                'validate_callback' => function ($param, $request, $key) {
                    return is_email($param);
                },
            ],
            'password' => [
                'required'    => true,
                'type'        => 'string',
                'description' => __( 'Password for the new account (minimum 6 characters).', 'zencommunity' ),
                'validate_callback' => function ($param) {
                    return is_string($param) && strlen($param) >= 6;
                },
            ],
            'first_name' => [
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'First name of the user.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'last_name' => [
                'required'          => false,
                'type'              => 'string',
                'description'       => __( 'Last name of the user.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ];
    }

    public function lost_password_schema() : array {
        return [
            'email' => [
                'required'          => true,
                'type'              => 'string',
                'description'       => __( 'Account email or username to send a reset link to.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
        ];
    }

    public function reset_password_schema() : array {
        return [
            'login' => [
                'required'          => true,
                'type'              => 'string',
                'description'       => __( 'Username from the emailed reset link.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'key' => [
                'required'          => true,
                'type'              => 'string',
                'description'       => __( 'Reset key from the emailed reset link.', 'zencommunity' ),
                'sanitize_callback' => 'sanitize_text_field',
            ],
            'password' => [
                'required'    => true,
                'type'        => 'string',
                'description' => __( 'New password (minimum 6 characters).', 'zencommunity' ),
                'validate_callback' => function ( $param ) {
                    return is_string( $param ) && strlen( $param ) >= 6;
                },
            ],
        ];
    }
}