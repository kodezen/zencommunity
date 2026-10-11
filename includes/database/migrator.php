<?php
namespace ZenCommunity\Database;
use ZenCommunity\Database\Utils\Migration;
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @class Migrator
 */
class Migrator {
	protected array $migrations = [
		Migrations\CreateProfileTable::class,
		Migrations\CreateGroupTable::class,
		Migrations\AddTypeColumnToGroups::class,
		Migrations\CreateGroupMemberTable::class,
		Migrations\CreateFeedTable::class,
		Migrations\CreateMediaTable::class,
		Migrations\CreateCommentTable::class,
		Migrations\CreateReactionTable::class,
		Migrations\CreateActivityTable::class,
		Migrations\CreateNotificationTable::class,
		Migrations\CreateNotifiedUsersTable::class,
		Migrations\CreateProcessLogTable::class,
		Migrations\CreateEventTable::class,
		Migrations\CreateEventRsvpTable::class,
		Migrations\AddTypeColumnToFeeds::class,
		Migrations\CreatePollOptionsTable::class,
		Migrations\CreatePollVotesTable::class,
		Migrations\CreateReportTable::class,
		Migrations\CreateBadgesTable::class,
		Migrations\CreateUserBadgesTable::class,
		Migrations\CreateCustomRolesTable::class,
		Migrations\AddRulesColumnToBadges::class,
		Migrations\CreateGroupMemberActionTable::class,
		Migrations\AddVoteScoreColumnToFeeds::class,
		Migrations\AddListingIndexToFeeds::class,
		Migrations\AddListingIndexToActivities::class,
		Migrations\AddListingIndexToAttachments::class,
		Migrations\AddListingIndexToReports::class,
		Migrations\AddListingIndexToProfiles::class,
		Migrations\AddReportingIndexToComments::class,
		Migrations\AddReportingIndexToReactions::class,
		Migrations\AddReportingIndexToGroupMembers::class,
		Migrations\AddReportingIndexToGroups::class,
		Migrations\AddReportingIndexToEventRsvps::class,
		Migrations\AddReportingIndexToGroupEvents::class,
	];

	public static function init() : void {
		( new static )->migrate_all();
	}

	public function migrate_all() : void {
		array_map( fn( string $class ) => $this->migrate( new $class ), $this->migrations );
	}

	protected function migrate( Migration $migration ) : void {
		$migration->migrate();
	}
}