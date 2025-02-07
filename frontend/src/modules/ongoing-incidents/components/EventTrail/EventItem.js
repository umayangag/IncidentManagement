import React from 'react';
import { useDispatch } from 'react-redux';
import ReactHtmlParser, { processNodes, convertNodeToElement, htmlparser2 } from 'react-html-parser';

import { withStyles } from '@material-ui/core/styles';
import Avatar from './Avatar';
import * as moment from 'moment';
import Button from '@material-ui/core/Button';

import { showModal } from '../../../modals/state/modal.actions'
import { API_BASE_URL } from '../../../../config';


const styles = {
    truncate: {
        width: "100%",
        whiteSpace: 'wrap'
    },
    eventItem: {
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        display: "flex",
        padding: "0px 0px 0px 0px",
        flexDirection: "column"
    },
    eventItemDetails: {
        display: "flex",
        padding: "10px 5px 10px 5px",
        backgroundColor: "#4241410d"
    },
    eventItemAvatar: {
        width: "25px",
        height: "25px",
        marginLeft: "5px"
    },
    eventItemUserDetails: {
        marginLeft: "10px",
        lineHeight: "25px"
    },
    eventItemBody: {
        width: "100%",
        padding: "10px 10px 10px 10px",
        borderTop: "1px solid #ccc"
    },
    eventItemActions: {
        marginLeft: 'auto'
    }
};


function getStatusChangeText(event) {
    const toStatus = event.data.status.to_status_type
    switch(toStatus){
        case 'VERIFIED':
            return 'verified the incident'
        case 'ADVICE_REQESTED':
            return `requested advice `
        case 'ADVICE_PROVIDED':
            return `provided action`
        case 'ACTION_PENDING':
            return `escallated the incident to outside entity`
        case 'ACTION_TAKEN':
            return 'action taken'
        case 'CLOSED':
            return 'closed the incident'
        default:
            return 'performed an unknown status change'
    }
}


function getActionText(event){
    switch(event.action){
        case "GENERIC_UPDATE":
            return "edited incident information";
        case "ATTRIBUTE_CHANGED":
            switch(event.affectedAttribute){
                case "STATUS":
                    return getStatusChangeText(event)
                case "SEVERITY":
                    return `changed the severity from ${event.data.severity.from_severity_type} 
                                to ${event.data.severity.to_severity_type}`;
                default:
                    return 'unknown attribute change'
            }
        case "ATTRIBUTE_CHANGE_REQUESTED":
            switch(event.affectedAttribute){
                case "STATUS":
                    return `requested to change the status from ${event.data.status.from_status_type} 
                                to ${event.data.status.to_status_type}`;
                default:
                        return 'unknown attribute change request'
            }
        case "ATTRIBUTE_CHANGE_APPROVED":
            return "approved requested change";
        case "ATTRIBUTE_CHANGE_REJECTED":
            return "rejected requested change";
        case "COMMENTED":
            return "commented on the incident";
        case "OUTCOME_ADDED":
            return "added new outcome for the incident";
        case "MEDIA_ATTACHED":
            return "attached media";
        case "ENTITY_ASSIGNED":
            return `assigned ${event.data.user.displayName} to the incident`;
        case "ENTITY_REMOVED":
            return `removed ${event.data.user.displayName} from the incident`
        case "CREATED":
            return ` created the incident`
        case "ACTION_STARTED":
            return ` escallated to ${JSON.parse(event.description).entity}`
        case "ACTION_COMPLETED":
            return ` marked as action completed`
        default:
            return "unknown action"
    }
}


function hasEventBody(event){
    const actionsWithBody = [
        "COMMENTED",
        "OUTCOME_ADDED",
        "ACTION_STARTED",
        "ACTION_COMPLETED",
        "ATTRIBUTE_CHANGED",
        "MEDIA_ATTACHED",
        "ENTITY_ASSIGNED"
    ];

    return actionsWithBody.indexOf(event.action) !== -1;
}


function getSecondaryItem(event){
    if(event.action === "COMMENTED" || event.action === "OUTCOME_ADDED"){
        return (
            <div>
                { ReactHtmlParser(event.data.comment.body)}
            </div>
        )
    }else if(
        event.action === "ATTRIBUTE_CHANGED" || 
        event.action === "ACTION_COMPLETED"
       ) {
        if(event.data.status && event.data.status.to_status_type === "CLOSED"){
            let descObj = JSON.parse(event.description);
            return (
                <div>
                    <div><b>Assignee(s)/ contact point(s):</b><br/> {descObj.assignee}</div><br/>
                    <div><b>Name of external entities /internal entities:</b><br /> {descObj.entities}</div><br/>
                    <div><b>Department(s), if any:</b><br /> {descObj.departments}</div><br/>
                    <div><b>Name of individual(s), if any:</b><br /> {descObj.individuals}</div><br/>
                    <div><b>Additional remarks:</b><br /> {descObj.remark}</div>
                </div>
            )
        }
        return (
            <div>
                { ReactHtmlParser(event.description)}
            </div>
        )
    }else if( event.action==="ACTION_STARTED"){
        let descObj = JSON.parse(event.description)

        return (
            <div>
                { ReactHtmlParser(`
                    <div>Entity:<br/> ${descObj.entity}</div><br/>
                    <div>Name:<br/> ${descObj.name}</div><br/>
                    <div>Comment:<br/> ${descObj.comment}</div><div></div>`
                )}
            </div>
        )
    }else if(event.action === "MEDIA_ATTACHED"){
        const file = event.data.media.file;
        return (
            <div>
                <a href={`${API_BASE_URL}/incidents/files/download/${file.id}`}>{file.name}</a>
            </div>
        )
    }else if(event.action === "ENTITY_ASSIGNED"){
        let descObj = JSON.parse(event.description)

        if(descObj){
            return (
                <div>
                    <div><b>Response Time:</b><br/> {descObj.responseTime} hours</div><br/>
                    <div><b>Comment:</b><br /> {descObj.comment}</div>
                </div>
            )
        }
        return (
            "No Comment"
        )
    }
    return (<></>);
}


function getDateDiff(event){
    return moment(event.createdDate).format("hh:mm A");
    // const hours = moment(new Date().getTime()).diff(event.createdDate, "hours");

    // if(hours < 24){
    //     if(hours === 0){
    //         return "a moment ago";
    //     }
    //     return `${hours} hours ago`;
    // }else if(hours < 720){
    //     const days = moment(new Date().getTime()).diff(event.createdDate, "days");
    //     return `${days} days ago`;
    // }else if(hours < 8640){
    //     const months = moment(new Date().getTime()).diff(event.createdDate, "months");
    //     return `${months} months ago`; 
    // }else{
    //     const years = moment(new Date().getTime()).diff(event.createdDate, "years")
    //     return `${years} years ago`;
    // }
}




const EventItemView = ({ event, eventAction, classes, eventLinks }) => {

    const dispatch = useDispatch()

    const hasPendingAdviceRequest = (event.action=== "ATTRIBUTE_CHANGED" && 
                                    event.data.status.to_status_type === "ADVICE_REQESTED" &&
                                    eventLinks[event.id]===undefined )

    let initiator = "Public User";
    if(event.initiator && event.initiator.userName !== "guest"){
        initiator = event.initiator.displayname;
    }

    return (
    <li className={classes.eventItem}>
        <div className={classes.eventItemDetails}>
            {/* <div className={classes.eventItemAvatar}>
                <Avatar user={event.author} />
            </div> */}
            <div className={classes.eventItemUserDetails}>
                <div className={classes.truncate}>
                    <strong>
                        {initiator}
                    </strong>{' '}
                     {getActionText(event)}
                    <span> ({getDateDiff(event)})</span>
                </div>

                {
                    (event.action === 'ACTION_STARTED' & !eventLinks[event.id]) ?
                    <div className={classes.eventItemActions}>
                        <Button 
                            color="primary"
                            className={classes.button} 
                            onClick={() => {
                                dispatch(
                                    showModal(
                                        'COMPLETE_OUTSIDE_ACTION_MODAL',
                                        {incidentId:event.incident.id, startEventId:event.id }
                                        )
                                    )
                                }
                            }
                        >
                            Complete Action
                        </Button>
                    </div> : null
                }
                {/* Status chnage approval action buttons. we may not need this anymore */}
                {event.action=== "ATTRIBUTE_CHANGE_REQUESTED" &&
                    !event.isResolved && 
                 (
                    <div className={classes.eventItemActions}>
                        <Button 
                            color="primary" 
                            className={classes.button} 
                            onClick={() => eventAction(event.id, "APPROVE")}
                        >
                            Approve
                        </Button>
                        <Button 
                            color="secondary" 
                            className={classes.button} 
                            onClick={() => eventAction(event.id, "REJECT")}
                        >
                            Reject
                        </Button>
                    </div>
                )}

                {hasPendingAdviceRequest && 
                 (
                    <div className={classes.eventItemActions}>
                        <Button 
                            color="primary" 
                            className={classes.button} 
                            onClick={() => dispatch(showModal(
                                            'PROVIDE_ADVICE_MODAL', 
                                            {  event }))}
                        >
                            Provide Advice
                        </Button>
                    </div>
                )}
            </div>
        </div>
        { hasEventBody(event) && (
            <div className={classes.eventItemBody}>
                {getSecondaryItem(event)}
            </div>    
        )}        
    </li>
)};


const EventItem = withStyles(styles)(EventItemView);
export default EventItem;