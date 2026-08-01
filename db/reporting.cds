namespace zmdr;

using zmdr.WFAudit from '../db/mdr-config';
using zmdr.CntrlUIVis from '../db/mdr-config';
using zmdr.BulkHdrConfig from '../db/mdr-config';

// using zmdr.SomeOtherEntity from '../db/mdr-config'; // e.g., Company or Approval log

entity WFAuditReport01 as
    select from zmdr.WFAudit as wfaudit {
        key wfaudit.SequenceId    as SequenceId,
            wfaudit.WorkflowId    as WorkflowId,
            wfaudit.EntityId      as EntityId,
            wfaudit.ActionTime    as ActionTime,
            wfaudit.OperationType as OperationType,
            wfaudit.EntityName    as EntityName,
            wfaudit.WfStage       as WfStage,
            wfaudit.Action        as Action,
            wfaudit.UserRemarks   as UserRemarks,
            wfaudit.ActioningUser as ActioningUser
    };


entity WFAuditReport02 as
        select from zmdr.WFAuditReport01 as A1 {
            key A1.SequenceId    as SequenceId,
                A1.WorkflowId    as WorkflowId,
                A1.EntityId      as EntityId,
                A1.ActionTime    as ActionTime,
                A1.OperationType as OperationType,
                A1.EntityName    as EntityName,
                A1.WfStage       as WfStage,
                A1.Action        as Action,
                A1.UserRemarks   as UserRemarks,
                A1.ActioningUser as ActioningUser
        }
        where
            A1.Action != 'INPROGRESS'
    union
        select from zmdr.WFAuditReport01 as A1
        left outer join zmdr.WFAuditReport01 as A2
            on  A1.WorkflowId =  A2.WorkflowId
            and A1.EntityId   =  A2.EntityId
            and A1.WfStage    =  A2.WfStage
            and A1.EntityName =  A2.EntityName
            and A2.Action     != 'INPROGRESS'
        {
            key A1.SequenceId    as SequenceId,
                A1.WorkflowId    as WorkflowId,
                A1.EntityId      as EntityId,
                A1.ActionTime    as ActionTime,
                A1.OperationType as OperationType,
                A1.EntityName    as EntityName,
                A1.WfStage       as WfStage,
                A1.Action        as Action,
                A1.UserRemarks   as UserRemarks,
                A1.ActioningUser as ActioningUser
        }
        where
                A1.Action     =  'INPROGRESS'
            and A2.SequenceId is null;

entity WFAuditReport03 as
        select from zmdr.WFAuditReport02 as WFAUDIT
        left outer join zmdr.CntrlUIVis as UIVIS
            on UIVIS.TableName = WFAUDIT.EntityName
        {
            key WFAUDIT.SequenceId    as SequenceId,
                WFAUDIT.WorkflowId    as WorkflowId,
                WFAUDIT.EntityId      as EntityId,
                WFAUDIT.ActionTime    as ActionTime,
                WFAUDIT.OperationType as OperationType,
                WFAUDIT.EntityName    as EntityName,
                cast(
                    case
                        when UIVIS.TableLabel is null
                             then WFAUDIT.EntityName
                        else UIVIS.TableLabel
                    end as String(40)
                )                     as EntityDescription,
                WFAUDIT.WfStage       as WfStage,
                WFAUDIT.Action        as Action,
                WFAUDIT.UserRemarks   as UserRemarks,
                WFAUDIT.ActioningUser as ActioningUser
        }
        where
            WFAUDIT.OperationType like 'MDR Central%'
    union
        select from zmdr.WFAuditReport02 as WFAUDIT
        left outer join zmdr.BulkHdrConfig as BULK
            on BULK.TableName = WFAUDIT.EntityName
        {
            key WFAUDIT.SequenceId    as SequenceId,
                WFAUDIT.WorkflowId    as WorkflowId,
                WFAUDIT.EntityId      as EntityId,
                WFAUDIT.ActionTime    as ActionTime,
                WFAUDIT.OperationType as OperationType,
                WFAUDIT.EntityName    as EntityName,
                cast(
                    case
                        when BULK.TableDescription is null
                             then WFAUDIT.EntityName
                        else BULK.TableDescription
                    end as String(40)
                )                     as EntityDescription,
                WFAUDIT.WfStage       as WfStage,
                WFAUDIT.Action        as Action,
                WFAUDIT.UserRemarks   as UserRemarks,
                WFAUDIT.ActioningUser as ActioningUser
        }
        where
            WFAUDIT.OperationType like 'BULK%'
    union
        select from zmdr.WFAuditReport02 as WFAUDIT {
            key WFAUDIT.SequenceId    as SequenceId,
                WFAUDIT.WorkflowId    as WorkflowId,
                WFAUDIT.EntityId      as EntityId,
                WFAUDIT.ActionTime    as ActionTime,
                WFAUDIT.OperationType as OperationType,
                WFAUDIT.EntityName    as EntityName,
                WFAUDIT.EntityName    as EntityDescription,
                WFAUDIT.WfStage       as WfStage,
                WFAUDIT.Action        as Action,
                WFAUDIT.UserRemarks   as UserRemarks,
                WFAUDIT.ActioningUser as ActioningUser
        }
        where
            not WFAUDIT.OperationType like 'BULK%'
            and                            not WFAUDIT.OperationType like 'MDR Central%';

entity WFAuditReport04 as
    select from zmdr.WFAuditReport03 {
        key SequenceId,
            WorkflowId,
            EntityId,
            ActionTime,
            OperationType,
            EntityName,
            EntityDescription,
            WfStage,
            Action,
            UserRemarks,
            ActioningUser
    }
    where
        WorkflowId != '';

entity WFAuditReport   as
    select from zmdr.WFAuditReport04 {
        key SequenceId,
            WorkflowId,
            EntityId,
            ActionTime,
            OperationType,
            EntityName,
            EntityDescription,
            WfStage,
            Action,
            UserRemarks,
            ActioningUser
    }
    order by
        WorkflowId asc, 
        ActionTime desc;