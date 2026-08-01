using ReportingService as service from '../../srv/reporting-service';
annotate service.WFAuditReport with {
    SequenceId @UI.Hidden;
};
annotate service.WFAuditReport with @(
    UI.HeaderInfo : {
        TypeName       : 'Record Count',
        TypeNamePlural : 'Record Counts'
    },
    UI.LineItem   : [
        {
            $Type      : 'UI.DataField',
            Value      : WorkflowId,
            Label      : 'Workflow ID',
            ![@HTML5.CssDefaults] : { width: '7rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : EntityId,
            Label      : 'Entity ID',
            ![@HTML5.CssDefaults] : { width: '7rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : EntityName,
            Label      : 'Entity Name',
            ![@HTML5.CssDefaults] : { width: '10rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : EntityDescription,
            Label      : 'Entity Description',
            ![@HTML5.CssDefaults] : { width: '20rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : Actiontime,
            Label      : 'Action Time',
            ![@HTML5.CssDefaults] : { width: '10rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : OperationType,
            Label      : 'Operation Type',
            ![@HTML5.CssDefaults] : { width: '8.5rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : WfStage,
            Label      : 'WF Stage',
            ![@HTML5.CssDefaults] : { width: '15rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : Action,
            Label      : 'Action',
            ![@HTML5.CssDefaults] : { width: '8rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : UserRemarks,
            Label      : 'User Remarks',
            ![@HTML5.CssDefaults] : { width: '20rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : ActioningUser,
            Label      : 'Actioning User',
            ![@HTML5.CssDefaults] : { width: '8rem' }
        }
    ],
    UI.SelectionFields : [
        WorkflowId,
        EntityId,
        EntityName
    ]
);

