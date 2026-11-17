# Delivery tracking and private proof photos

## Confirmed local deployment

The local database has all 11 delivery storage/tracking columns. The local legacy-photo import added no schema columns: it copied five existing photos into the database while preserving the original delivery rows, legacy URL values, original files and verified photo hashes. Three original photos remain missing, so their legacy references could not be imported. The importer cannot reconstruct missing photo contents.

The protected pre-import backup is `japz-backend/.local/backups/delivery-before-database-proofs-1794887897540.json` relative to the repository root. Retain it as private local data, outside source control and public downloads. The local completion does not establish schema or import readiness for another environment; run the read-only preflight there and apply the dedicated additive migration wherever any required columns are missing.

## Read-only preflight and future deployment plan

The following check is read-only. It describes the delivery schema, counts stored/legacy proof references, and checks confined legacy file metadata without reading image contents or selecting BLOB values:

```powershell
node scripts/check-delivery-storage.js
```

Its aggregate output includes the 11 required migration columns, missing columns, proof counts, and referenced file bytes/missing/unsafe/oversized counts. It prints no row ids, customer details, URLs, paths or connection secrets. File totals are per legacy reference and can count the same physical file more than once. This check does not validate image signatures or create a backup. Run the importer dry run for content validation after the schema migration.

For a future deployment, use this sequence against the explicitly selected environment:

1. Run the read-only preflight and retain its aggregate report.
2. Pause the backend and any other delivery writers for a consistent snapshot. Use the database provider's protected snapshot/export feature or a native MySQL backup tool with a password prompt, login path or protected option file. Keep credentials out of command arguments/history, and store the database backup and original `public/uploads/pod` files in an access-restricted backup destination.
3. Verify the backup completed and can be restored to an isolated environment. Retain the original files throughout migration/import.
4. Apply only `migrations/add-delivery-live-tracking.js`, then repeat the preflight and confirm `missingColumns` is empty. This dedicated migration does not touch payroll, reservations or attendance.
5. Run the legacy importer in dry-run mode and inspect its results. Run `--apply` only as a separate, explicit step after that review, then inspect the aggregate counts again.
6. Start the updated backend and verify assigned-rider sharing, authorized customer tracking and authenticated proof retrieval. Keep public POD serving blocked and retain the protected backup/original files.

This sequence is the operator plan for future environments. Automated tests use temporary files, fake database objects or generated disposable schemas. The confirmed local import described above is a separate completed local operation.

## Dedicated migration

Apply the dedicated migration to the intended database **before starting the updated backend**. It only adds columns to the existing `deliveries` table. It preserves delivery rows, legacy proof paths, and every other table; it does not run the broader integration or attendance migrations.

Run from `japz-backend`, with the intended database connection environment configured:

```powershell
node migrations/add-delivery-live-tracking.js
```

The migration is repeatable and reports failure if the existing delivery workflow table is missing. It adds four database photo fields (`proofPhotoData` as `LONGBLOB`, MIME, size and SHA-256), plus the latest location, its accuracy and capture/server update times, the last server stop time, and an opt-in sharing flag. No location history is stored. Database backups now contain proof photos; configure MySQL packet limits to accept a 6MB image plus the surrounding SQL request.

New proof uploads are held in memory, validated as JPEG, PNG or WebP, and committed to the database with delivery completion. List APIs omit binary photo data. Photo URLs point to the bearer-authenticated `/api/deliveries/:id/proof` endpoint; clients fetch the binary with their session token and create an object URL for display. Rider owners, cashier/admin staff and the customer who owns the order can retrieve proofs. The public `/uploads/pod` path must remain blocked by the backend even while original legacy files remain on disk.

Existing files can be reviewed and copied into the database separately. The command defaults to a **dry run**:

```powershell
node scripts/import-legacy-delivery-proofs.js
node scripts/import-legacy-delivery-proofs.js --dry-run
```

After reviewing the per-delivery results, import eligible files:

```powershell
node scripts/import-legacy-delivery-proofs.js --apply
```

The importer accepts only plain `/uploads/pod/<filename>.jpg`, `.jpeg`, `.png` or `.webp` paths, verifies that each resolved file remains inside `public/uploads/pod`, caps each read at 6MB, and validates the image signature against its MIME type. Missing, unsafe, oversized or invalid files are reported as failures; remaining rows are still checked. Apply mode locks and rechecks each delivery, populates only missing database photo data, and preserves both the original file and its legacy URL value. Repeating the import skips records already stored in the database. It never deletes, renames or edits files. The authenticated download endpoint can read valid legacy files until backfill is complete.

During an active delivery, the assigned rider can send `PUT /api/rider/deliveries/:id/location` with numeric `lat`, `lng`, `accuracy` and an ISO `capturedAt`. `DELETE` on the same route stops sharing and clears the snapshot. Location samples expire after 90 seconds without an accepted update, and unavailable/stale responses hide coordinates. Customers receive the snapshot through their existing authorized order tracking API. Completion also clears the location snapshot. The restaurant's configured delivery estimate remains an estimate; GPS updates do not imply a traffic-based arrival prediction.

Stopping sharing records a server stop time. Updates captured at or before that time are rejected, so an in-flight older request cannot restore a location that the rider has stopped sharing. Updates must also be newer than the last accepted sample. Browser tracking requires the rider's page to stay open in the foreground; screen locks, suspended/background tabs, denied location permission, or unavailable GPS can interrupt updates. The customer then sees a stale or unavailable location until sharing resumes with a fresh accepted sample.

Pure migration/backfill tests use temporary files and fake database objects:

```powershell
node --test tests/deliveryStorageMigration.test.js
node --test tests/deliveryStorageCheck.test.js
```

No migration or import is performed by these tests, and they never connect to an application database.

Location/photo validation and static-access protection also have pure tests. The API harness creates and drops only a generated `japz_delivery_test_<timestamp>_<pid>` database, applies the delivery migration there, and serves the routers on an ephemeral local port. It does not start or restart the application backend. It verifies customer/rider authorization, attendance access, stale/stop handling, database BLOB storage, rollback and duplicate-completion behavior, authenticated downloads, and legacy import preservation.

```powershell
node --test tests/deliveryTracking.test.js tests/deliveryStorageMigration.test.js
node --test tests/deliveryApi.test.js
```
