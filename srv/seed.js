const cds = require('@sap/cds');

async function seed() {
  cds.model = await cds.load('*');
  const db = await cds.connect.to('db');
  await db.run(INSERT.into('zmdr.GLAccount').entries([
    {
      GlAccountNum: '100001',
      VersionStartDate: '2026-10-25T15:53:55.979Z',
      CompanyCode: '1000',
      AccountDesc: 'Cash Account',
      AccountType: 'BA',
      Currency: 'EUR',
      Status: 'ACT',
      WorkflowId: 'CTR_TEST_01',
      VersionActive: 'Y',
      CreatedOn: '2026-10-25T15:53:55.989Z',
      CreatedBy: 'anonymous',
      UpdatedOn: '2026-10-25T15:53:56.031Z',
      UpdatedBy: 'anonymous'
    },
    {
      GlAccountNum: '100003',
      VersionStartDate: '2026-10-25T15:53:55.994Z',
      CompanyCode: '1000',
      AccountDesc: 'Self Approval Test',
      AccountType: 'BA',
      Currency: 'EUR',
      Status: 'DFT',
      WorkflowId: 'CTR_TEST_03',
      VersionActive: 'I',
      CreatedOn: '2026-10-25T15:53:55.997Z',
      CreatedBy: 'anonymous',
      UpdatedOn: '2026-10-25T15:53:55.997Z',
      UpdatedBy: 'anonymous'
    },
    {
      GlAccountNum: '100004',
      VersionStartDate: '2026-01-01T00:00:00.000Z',
      CompanyCode: '1000',
      AccountDesc: 'Old Description',
      AccountType: 'BA',
      Currency: 'EUR',
      Status: 'ACT',
      WorkflowId: 'WF_OLD_04',
      VersionActive: 'N',
      VersionEndDate: '2026-10-25T15:53:56.037Z',
      CreatedOn: '2026-10-25T15:53:56.001Z',
      CreatedBy: 'anonymous',
      UpdatedOn: '2026-10-25T15:53:56.037Z',
      UpdatedBy: 'anonymous'
    },
    {
      GlAccountNum: '100004',
      VersionStartDate: '2026-10-25T00:00:00.000Z',
      CompanyCode: '1000',
      AccountDesc: 'Amended Description',
      AccountType: 'BA',
      Currency: 'EUR',
      Status: 'ACT',
      WorkflowId: 'CTR_TEST_04',
      VersionActive: 'Y',
      CreatedOn: '2026-10-25T15:53:56.002Z',
      CreatedBy: 'anonymous',
      UpdatedOn: '2026-10-25T15:53:56.037Z',
      UpdatedBy: 'anonymous'
    }
  ]));
  console.log('Seeded 4 accounts successfully');
}

seed();
