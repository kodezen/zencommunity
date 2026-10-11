<?php
namespace ZenCommunity\Api;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use ZenCommunity\Database\Models\Profile;
use ZenCommunity\Addons\AcademyLms\Api\Common\Permissions;
class Auth extends Common\Base {
    use Schema\AuthSchema;
    public function init() : void {
        register_rest_route( $this->namespace, '/auth/signin', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'signin' ],
            'permission_callback' => fn() : bool =>  ! is_user_logged_in(),
            'args'                => $this->signin_schema(),
        ] );
        
        register_rest_route( $this->namespace, '/auth/signup', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'signup' ],
            'permission_callback' => fn() : bool =>  ! is_user_logged_in(),
            'args'                => $this->signup_schema(),
        ] );

        register_rest_route( $this->namespace, '/auth/signout', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'sign_out' ],
            'permission_callback' => fn() : bool =>  is_user_logged_in(),
        ] );

        register_rest_route( $this->namespace, '/auth/lost-password', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'lost_password' ],
            'permission_callback' => fn() : bool =>  ! is_user_logged_in(),
            'args'                => $this->lost_password_schema(),
        ] );

        register_rest_route( $this->namespace, '/auth/reset-password', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'reset_password' ],
            'permission_callback' => fn() : bool =>  ! is_user_logged_in(),
            'args'                => $this->reset_password_schema(),
        ] );

        register_rest_route( $this->namespace, '/settings/user/create', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [ $this, 'create_member' ],
            'permission_callback' => [ Permissions::class, 'admin_can'  ],
            'args'                => $this->signup_schema(),
        ] );

        add_filter( 'rest_post_dispatch', function( $response, $server, WP_REST_Request $request ) {
            $route = $request->get_route();
            if ( str_starts_with( $route, '/' . $this->namespace . '/auth/' ) ) {
                $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
                $response->header( 'Pragma', 'no-cache' );
            }
            return $response;
        }, 10, 3 );
    }

    public function signin( WP_REST_Request $request ) : WP_REST_Response {

        if ( is_user_logged_in() ) {
            return new WP_REST_Response( [
                'success' => true,
                'message' => __( 'You are already logged in.', 'zencommunity' ),
                'data'    => Profile::current(),
            ] );
        }

        $params         = $request->get_params();
        $user_identifier = isset( $params['user'] ) ? sanitize_text_field( $params['user'] ) : '';
        $password       = isset( $params['password'] ) ? $params['password'] : '';
        $remember_me    = isset( $params['remember_me'] ) ? (bool) $params['remember_me'] : true;

        if ( empty( $user_identifier ) || empty( $password ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Username/email and password are required.', 'zencommunity' ),
            ], 400 );
        }

        $creds = [
            'user_login'    => $user_identifier,
            'user_password' => $password,
            'remember'      => $remember_me,
        ];

        $user = wp_signon( $creds );

        if ( is_wp_error( $user ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Invalid username/email or password.', 'zencommunity' ),
            ], 400 );
        }

        return new WP_REST_Response( [
            'success' => true,
            'message' => __( 'Logged in successfully.', 'zencommunity' ),
            'data'    => Profile::current(),
        ] );
    }

    public function signup( WP_REST_Request $request ) : WP_REST_Response {
        global $zencommunity_settings;
        if ( ! $zencommunity_settings->allow_member_registration )
            return new WP_REST_Response( [
                'success' => false,
                'message' =>__( 'Member registration is currently disabled.', 'zencommunity' )
            ], 401 );

        // "Override WordPress Registration Setting" (Login & Registration tab): when
        // off, ZenCommunity defers to WP core's own "Anyone can register" option
        // instead of always accepting signups regardless of it. Defaults to true
        // (see Settings::output()) so upgrading sites keep today's behavior.
        $override = $zencommunity_settings->override_wp_registration ?? true;
        if ( ! $override && ! get_option( 'users_can_register' ) )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'User registration is currently disabled in WordPress settings.', 'zencommunity' )
            ], 401 );

        if ( is_user_logged_in() )
            return new WP_REST_Response( [
                'success' => true,
                'message' => __( 'You are already logged in.', 'zencommunity' ),
                'data' => Profile::current(),
            ] );
        
        return $this->create_member( $request );
    }

    public function create_member( WP_REST_Request $request ) : WP_REST_Response {
        $params = $request->get_params();
        $first_name = sanitize_text_field( $params['first_name'] ?? '' );
        $last_name  = sanitize_text_field( $params['last_name'] ?? '' );
        $username   = sanitize_user( $params['username'] ?? '' );
        $email      = sanitize_email( $params['email'] );
        $password   = $params['password'];

        // If a guest already filed tickets under this email (auto-registered
        // visitor), claim+upgrade that same account so their tickets carry over.
        $existing_user = is_email( $email ) ? get_user_by( 'email', $email ) : false;
        $claim_user    = ( $existing_user instanceof \WP_User && self::is_claimable_visitor( $existing_user ) ) ? $existing_user : null;

        $errors = [];
        if( ! is_email( $email ) ) {
            $errors['email'] = __( 'invalid email.', 'zencommunity' );
        }

        if( email_exists( $email ) && ! $claim_user ) {
            $errors['email'] = __( 'email already exists.', 'zencommunity' );
        }

        if( ! empty( $username ) && username_exists( $username ) ) {
            $errors['username'] = __( 'username already in use.', 'zencommunity' );
        }

        if( empty( $password ) ) {
            $errors['password'] = __( 'Password is required.', 'zencommunity' );
        }

        if( ! empty( $password ) && strlen( $password ) < 6 ) {
            $errors['password'] = __( 'Password must be at least 6 characters.', 'zencommunity' );
        }

        if ( ! empty( $errors ) ) {
            return new WP_REST_Response( [
                'success' => false,
                // $errors already holds a specific, accurate message per field
                // (e.g. "email already exists.") — summarizing them as a
                // generic "fields are required" was wrong for every case
                // except a genuinely missing password.
                'message' => implode( ' ', $errors ),
                'errors' => $errors,
            ], 422 );
        }

        if ( empty( $username ) ) {
            $username = $this->username_from_email( $email );
        }

        if ( $claim_user ) {
            // A guest/visitor account (auto-created for tickets/chat) is only
            // claimed by whoever controls its email: nothing on the account
            // changes here. The owner gets WordPress's own password-reset
            // link; completing it runs finalize_claim() (after_password_reset),
            // which applies these details and upgrades the account so the
            // prior tickets carry over.
            update_user_meta( $claim_user->ID, '_zenc_claim_pending', [
                'first_name' => $first_name,
                'last_name'  => $last_name,
            ] );

            add_filter( 'retrieve_password_message', [ __CLASS__, 'reset_password_message' ], 10, 4 );
            $sent = retrieve_password( $claim_user->user_login );
            remove_filter( 'retrieve_password_message', [ __CLASS__, 'reset_password_message' ], 10 );

            if ( is_wp_error( $sent ) ) {
                return new WP_REST_Response( [
                    'success' => false,
                    'message' => __( 'Could not send the confirmation email. Please try again later.', 'zencommunity' ),
                ], 500 );
            }

            return new WP_REST_Response( [
                'success'               => true,
                'requires_confirmation' => true,
                'message'               => __( 'We sent you an email. Follow the link in it to set your password and finish creating your account.', 'zencommunity' ),
            ], 202 );
        } else {
            $user_id = register_new_user( $username, $email );
            if ( is_wp_error( $user_id ) ) {
                return new WP_REST_Response( [
                    'success' => false,
                    'message' => __( 'Error.', 'zencommunity' ),
                ], 500 );
            }
            wp_set_password( $password, $user_id );
            update_user_meta( $user_id, 'first_name', $first_name );
            update_user_meta( $user_id, 'last_name',  $last_name );
        }

        wp_new_user_notification( $user_id, null, 'both' );

        return new WP_REST_Response([
            'success' => true,
            'message' =>  __( 'User registered successfully.', 'zencommunity' ),
            'data'    =>  Profile::create_profile_if_not_exists( $user_id )
        ], 201);
    }

    /**
     * Completes a visitor-account claim (see create_member()) once its owner
     * has set a password through the emailed reset link.
     */
    public static function finalize_claim( $user ) : void {
        if ( ! $user instanceof \WP_User ) {
            return;
        }
        $pending = get_user_meta( $user->ID, '_zenc_claim_pending', true );
        if ( ! is_array( $pending ) || ! self::is_claimable_visitor( $user ) ) {
            return;
        }

        $first_name = sanitize_text_field( $pending['first_name'] ?? '' );
        $last_name  = sanitize_text_field( $pending['last_name'] ?? '' );
        update_user_meta( $user->ID, 'first_name', $first_name );
        update_user_meta( $user->ID, 'last_name', $last_name );
        wp_update_user( [ 'ID' => $user->ID, 'display_name' => trim( "{$first_name} {$last_name}" ) ?: $user->user_email ] );
        $user->set_role( get_option( 'default_role', 'subscriber' ) );
        delete_user_meta( $user->ID, '_zenc_guest_visitor' );
        delete_user_meta( $user->ID, '_zenc_claim_pending' );
        Profile::create_profile_if_not_exists( $user->ID );
    }

    /**
     * A "claimable" account is a guest/visitor auto-created for tickets/chat
     * (marker meta, the live_chat_visitor role, or the lcv_/tkv_ login prefix).
     * Registering with that email upgrades it instead of erroring.
     */
    private static function is_claimable_visitor( \WP_User $user ) : bool {
        if ( get_user_meta( $user->ID, '_zenc_guest_visitor', true ) ) {
            return true;
        }
        if ( in_array( 'live_chat_visitor', (array) $user->roles, true ) ) {
            return true;
        }
        $login = (string) ( $user->user_login ?? '' );
        return 0 === strpos( $login, 'lcv_' ) || 0 === strpos( $login, 'tkv_' );
    }

    private function username_from_email( string $email ) : string { 
        $username = sanitize_user( current( explode( '@', $email ) ), true );
        $original_username = $username;
        $counter = 1;
        while (username_exists($username)) {
            $username = $original_username . $counter;
            $counter++;
        }
        return $username;
    }

    public function sign_out( WP_REST_Request $request ) : WP_REST_Response {
        if ( ! is_user_logged_in() )
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'You are already logged out.', 'zencommunity' ),
            ] );

        // logout current user 
        wp_logout();

        return new WP_REST_Response( [
            'success' => true,
            'message' => __( 'You are logged out.', 'zencommunity' ),
        ] );
    }

    /**
     * Step 1 of the SPA's own reset flow: email a link into the SPA's
     * /reset-password route (not wp-login.php) carrying the standard WP core
     * {login, key} pair, so reset_password() below can validate it.
     */
    public function lost_password( WP_REST_Request $request ) : WP_REST_Response {
        $identifier = (string) $request->get_param( 'email' );
        // Always the same generic response regardless of whether the account
        // exists - confirming/denying here is the classic enumeration leak,
        // matching Auth::signin()'s own generic invalid-credentials message.
        $generic = [
            'success' => true,
            'message' => __( 'If an account exists for that email or username, a reset link has been sent.', 'zencommunity' ),
        ];

        $user = is_email( $identifier ) ? get_user_by( 'email', $identifier ) : get_user_by( 'login', $identifier );
        if ( ! $user ) {
            return new WP_REST_Response( $generic );
        }

        add_filter( 'retrieve_password_message', [ __CLASS__, 'reset_password_message' ], 10, 4 );
        $sent = retrieve_password( $user->user_login );
        remove_filter( 'retrieve_password_message', [ __CLASS__, 'reset_password_message' ], 10 );

        if ( is_wp_error( $sent ) ) {
            // Only a genuine send failure (e.g. mail transport down) reaches
            // here - "no such account" was already handled generically above.
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'Could not send the reset email. Please try again later.', 'zencommunity' ),
            ], 500 );
        }

        return new WP_REST_Response( $generic );
    }

    /** Points the emailed link at the SPA's own /reset-password route. */
    public static function reset_password_message( $message, $key, $user_login, $user_data ) : string {
        $path     = trim( (string) ( $GLOBALS['zencommunity_settings']->path ?? '' ), '/' );
        $reset_url = add_query_arg(
            [ 'login' => rawurlencode( $user_login ), 'key' => $key ],
            home_url( ( $path ? "/{$path}" : '' ) . '/reset-password' )
        );

        /* translators: %s: site name */
        $message  = sprintf( __( 'Someone has requested a password reset for your account on %s.', 'zencommunity' ), wp_specialchars_decode( get_option( 'blogname' ), ENT_QUOTES ) ) . "\r\n\r\n";
        $message .= __( 'If this was a mistake, ignore this email and nothing will happen.', 'zencommunity' ) . "\r\n\r\n";
        $message .= __( 'To reset your password, visit the following address:', 'zencommunity' ) . "\r\n\r\n";
        $message .= $reset_url . "\r\n\r\n";
        return $message;
    }

    /**
     * Step 2: the visitor lands back on /reset-password with {login, key}
     * and a new password - validate against WP core's own key store (the
     * same mechanism every other reset flow on this install, e.g. Academy's,
     * ultimately relies on) and set it.
     */
    public function reset_password( WP_REST_Request $request ) : WP_REST_Response {
        $login    = (string) $request->get_param( 'login' );
        $key      = (string) $request->get_param( 'key' );
        $password = (string) $request->get_param( 'password' );

        $user = check_password_reset_key( $key, $login );
        if ( is_wp_error( $user ) ) {
            return new WP_REST_Response( [
                'success' => false,
                'message' => __( 'This reset link is invalid or has expired. Please request a new one.', 'zencommunity' ),
            ], 400 );
        }

        reset_password( $user, $password );

        return new WP_REST_Response( [
            'success' => true,
            'message' => __( 'Your password has been updated. You can now sign in.', 'zencommunity' ),
        ] );
    }
}