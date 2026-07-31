namespace zmdr;

using zmdr.WFAudit from '../db/mdr-config';
using zmdr.CntrlUIVis from '../db/mdr-config';
using zmdr.BulkHdrConfig from '../db/mdr-config';

// using zmdr.SomeOtherEntity from '../db/mdr-config'; // e.g., Company or Approval log

entity WFAuditReport01 as
    select from zmdr.WFAudit as wfaudit {
        key wfaudit.sequenceid    as Sequenceid,
            wfaudit.workflowid    as Workflowid,
            wfaudit.entityid      as Entityid,
            wfaudit.actiontime    as Actiontime,
            wfaudit.operationtype as Operationtype,
            wfaudit.entityname    as Entityname,
            wfaudit.wfstage       as Wfstage,
            wfaudit.action        as Action,
            wfaudit.userremarks   as Userremarks,
            wfaudit.actioninguser as Actioninguser
    };


entity WFAuditReport02 as
        select from zmdr.WFAuditReport01 as A1 {
            key A1.Sequenceid    as Sequenceid,
                A1.Workflowid    as Workflowid,
                A1.Entityid      as Entityid,
                A1.Actiontime    as Actiontime,
                A1.Operationtype as Operationtype,
                A1.Entityname    as Entityname,
                A1.Wfstage       as Wfstage,
                A1.Action        as Action,
                A1.Userremarks   as Userremarks,
                A1.Actioninguser as Actioninguser
        }
        where
            A1.Action != 'INPROGRESS'
    union
        select from zmdr.WFAuditReport01 as A1
        left outer join zmdr.WFAuditReport01 as A2
            on  A1.Workflowid =  A2.Workflowid
            and A1.Entityid   =  A2.Entityid
            and A1.Wfstage    =  A2.Wfstage
            and A1.Entityname =  A2.Entityname
            and A2.Action     != 'INPROGRESS'
        {
            key A1.Sequenceid    as Sequenceid,
                A1.Workflowid    as Workflowid,
                A1.Entityid      as Entityid,
                A1.Actiontime    as Actiontime,
                A1.Operationtype as Operationtype,
                A1.Entityname    as Entityname,
                A1.Wfstage       as Wfstage,
                A1.Action        as Action,
                A1.Userremarks   as Userremarks,
                A1.Actioninguser as Actioninguser
        }
        where
                A1.Action     =  'INPROGRESS'
            and A2.Sequenceid is null;

entity WFAuditReport03 as
        select from zmdr.WFAuditReport02 as WFAUDIT
        left outer join zmdr.CntrlUIVis as UIVIS
            on UIVIS.tablename = WFAUDIT.Entityname
        {
            key WFAUDIT.Sequenceid    as Sequenceid,
                WFAUDIT.Workflowid    as Workflowid,
                WFAUDIT.Entityid      as Entityid,
                WFAUDIT.Actiontime    as Actiontime,
                WFAUDIT.Operationtype as Operationtype,
                WFAUDIT.Entityname    as Entityname,
                cast(
                    case
                        when UIVIS.tablelabel is null
                             then WFAUDIT.Entityname
                        else UIVIS.tablelabel
                    end as String(40)
                )                     as EntityDescription,
                WFAUDIT.Wfstage       as Wfstage,
                WFAUDIT.Action        as Action,
                WFAUDIT.Userremarks   as Userremarks,
                WFAUDIT.Actioninguser as Actioninguser
        }
        where
            WFAUDIT.Operationtype like 'MDR Central%'
    union
        select from zmdr.WFAuditReport02 as WFAUDIT
        left outer join zmdr.BulkHdrConfig as BULK
            on BULK.TableName = WFAUDIT.Entityname
        {
            key WFAUDIT.Sequenceid    as Sequenceid,
                WFAUDIT.Workflowid    as Workflowid,
                WFAUDIT.Entityid      as Entityid,
                WFAUDIT.Actiontime    as Actiontime,
                WFAUDIT.Operationtype as Operationtype,
                WFAUDIT.Entityname    as Entityname,
                cast(
                    case
                        when BULK.TableDescription is null
                             then WFAUDIT.Entityname
                        else BULK.TableDescription
                    end as String(40)
                )                     as EntityDescription,
                WFAUDIT.Wfstage       as Wfstage,
                WFAUDIT.Action        as Action,
                WFAUDIT.Userremarks   as Userremarks,
                WFAUDIT.Actioninguser as Actioninguser
        }
        where
            WFAUDIT.Operationtype like 'BULK%'
    union
        select from zmdr.WFAuditReport02 as WFAUDIT {
            key WFAUDIT.Sequenceid    as Sequenceid,
                WFAUDIT.Workflowid    as Workflowid,
                WFAUDIT.Entityid      as Entityid,
                WFAUDIT.Actiontime    as Actiontime,
                WFAUDIT.Operationtype as Operationtype,
                WFAUDIT.Entityname    as Entityname,
                WFAUDIT.Entityname    as EntityDescription,
                WFAUDIT.Wfstage       as Wfstage,
                WFAUDIT.Action        as Action,
                WFAUDIT.Userremarks   as Userremarks,
                WFAUDIT.Actioninguser as Actioninguser
        }
        where
            not WFAUDIT.Operationtype like 'BULK%'
            and                            not WFAUDIT.Operationtype like 'MDR Central%';

entity WFAuditReport04 as
    select from zmdr.WFAuditReport03 {
        key Sequenceid,
            Workflowid,
            Entityid,
            Actiontime,
            Operationtype,
            Entityname,
            EntityDescription,
            Wfstage,
            Action,
            Userremarks,
            Actioninguser
    }
    where
        Workflowid != '';

entity WFAuditReport   as
    select from zmdr.WFAuditReport04 {
        key Sequenceid,
            Workflowid,
            Entityid,
            Actiontime,
            Operationtype,
            Entityname,
            EntityDescription,
            Wfstage,
            Action,
            Userremarks,
            Actioninguser
    }
    order by
        Workflowid asc,
        Actiontime desc;