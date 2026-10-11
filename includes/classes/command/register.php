<?php
namespace ZenCommunity\Classes\Command;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}
class Register {
    public array $commands = [
        SeedData::class,
    ];

    public static function init() : void {
        if ( defined( 'WP_CLI' ) && WP_CLI ) {
            $ins = new static;
            $ins->commands = array_unique( array_merge(
                apply_filters( 'zencommunity/command/register', $ins->commands ),
                $ins->commands
            ) );
            $registered = [];
            foreach ( $ins->commands as $command ) {
                if ( is_subclass_of( $command, Base::CLASS ) && ! in_array( $command::$name, $registered, true ) ) {
                    \WP_CLI::add_command( $command::$name, $command );
                    $registered[] = $command::$name;
                }
            }
        }

    }
}
