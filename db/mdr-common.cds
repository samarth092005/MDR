namespace zmdr;

// Common aspects to be used in multiple entities
aspect Auditable {
  @cds.on.insert: $now
  CreatedOn             : Timestamp;
  @cds.on.insert: $user
  CreatedBy             : String(50);
  @cds.on.insert: $now   @cds.on.update: $now
  UpdatedOn             : Timestamp;
  @cds.on.insert: $user  @cds.on.update: $user
  UpdatedBy             : String(50);
}

aspect Versionable {
  VersionEndDate   : Timestamp;
  VersionActive    : String(1); // Y=Active N=Inactive G=BulkUpdate I=SingleUpdate F=Future
}

// Approval Status Table
entity ApprovalStatus : Auditable {
  key Code           : String(10);
      Description    : String(50);
}