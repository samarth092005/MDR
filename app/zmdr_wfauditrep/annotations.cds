using ReportingService as service from '../../srv/reporting-service';
annotate service.WFAuditReport with {
    Sequenceid @UI.Hidden;
};
annotate service.WFAuditReport with @(
    UI.HeaderInfo : {
        TypeName       : 'Record Count',
        TypeNamePlural : 'Record Counts'
    },
    UI.LineItem   : [
        {
            $Type      : 'UI.DataField',
            Value      : Workflowid,
            Label      : 'Workflow ID',
            ![@HTML5.CssDefaults] : { width: '7rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : Entityid,
            Label      : 'Entity ID',
            ![@HTML5.CssDefaults] : { width: '7rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : Entityname,
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
            Value      : Operationtype,
            Label      : 'Operation Type',
            ![@HTML5.CssDefaults] : { width: '8.5rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : Wfstage,
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
            Value      : Userremarks,
            Label      : 'User Remarks',
            ![@HTML5.CssDefaults] : { width: '20rem' }
        },
        {
            $Type      : 'UI.DataField',
            Value      : Actioninguser,
            Label      : 'Actioning User',
            ![@HTML5.CssDefaults] : { width: '8rem' }
        }
    ],
    UI.SelectionFields : [
        Workflowid,
        Entityid,
        Entityname
    ]
);

