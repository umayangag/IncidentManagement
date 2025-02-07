"""Reports"""

from django.db import connection
import pandas as pd
import numpy as np

from ..common.models import Category, Channel
from ..incidents.models import Incident
from .functions import get_summary_by, get_general_report, get_detailed_severity_report


def get_category_summary(start_date, end_date, detailed_report):
    if detailed_report == 'true':
        return get_summary_by(Category, "top_category", "common_category", "incident.category", start_date, end_date)
    return get_general_report("top_category", "Category", "common_category", "category", "id", start_date, end_date)


def get_subcategory_summary(start_date, end_date, detailed_report):
    if detailed_report == 'true':
        return get_summary_by(Category, "sub_category", "common_category", "incident.category", start_date, end_date)
    return get_general_report("sub_category", "Subcategory", "common_category", "category", "id", start_date, end_date)


def get_mode_summary(start_date, end_date, detailed_report):
    if detailed_report == 'true':
        return get_summary_by(Channel, "name", "common_channel", "incident.infoChannel", start_date, end_date)
    return get_general_report("name", "Mode", "common_channel", "infoChannel", "id", start_date, end_date)


def get_district_summary(start_date, end_date, detailed_report):
    # if detailed_report == 'true':
    # return get_summary_by(Channel, "name", "common_channel", "incident.infoChannel", start_date, end_date)
    return get_general_report("name", "District", "common_district", "district", "code", start_date, end_date)


def get_severity_summary(start_date, end_date, detailed_report):
    if detailed_report == 'true':
        return get_detailed_severity_report(start_date, end_date)
    sql = """
         SELECT    Ifnull(name,'Unassigned') AS Severity,
                   Ifnull(subtotal,0)        AS Total
         FROM      reporting_severitysegment AS d
         LEFT JOIN
                   (
                            SELECT   (
                                     CASE
                                              WHEN severity > 7 THEN 'High'
                                              WHEN severity > 3 THEN 'Medium'
                                              ELSE 'Low'
                                     end)                                           AS currentstate,
                                     Count(Ifnull(incidents_incident.severity,0)) AS subtotal
                            FROM     incidents_incident
                            WHERE    occured_date BETWEEN '%s' AND      '%s'
                            OR       severity IS NULL
                            GROUP BY currentstate) AS incidents
         ON        currentstate = d.name 
         UNION ALL
        SELECT '(Total No. of Incidents)',
               Count(id)
        FROM   incidents_incident
        WHERE  occured_date BETWEEN '%s' AND '%s'
        ORDER  BY Field(Severity, 'High', 'Medium', 'Low', '(Total No. of Incidents)') 
    """ % (start_date, end_date, start_date, end_date)
    dataframe = pd.read_sql_query(sql, connection)
    dataframe = dataframe.fillna(0)
    return dataframe.to_html(index=False)


def get_status_summary(start_date, end_date, detailed_report):
    if detailed_report == 'true':
        return get_summary_by(Incident, "current_status", "incidents_incident", "incident.id", start_date, end_date)
    sql = """
        SELECT name                  AS Status,
               Ifnull(subtotal, '0') AS Total
        FROM   reporting_statussegment AS d
               LEFT JOIN (SELECT ( CASE
                                     WHEN Ifnull(current_status, 'Unassigned') LIKE
                                          'CLOSED'
                                                                       THEN
                                     'Resolved'
                                     ELSE 'Unresolved'
                                   end )                          AS currentState,
                                 Count(Ifnull(current_status, 1)) AS subtotal
                          FROM   incidents_incident
                          WHERE  occured_date BETWEEN '%s' AND
                                                      '%s'
                          GROUP  BY currentstate) AS incidents
                      ON currentstate = d.name
        UNION ALL
        SELECT '(Total No. of Incidents)',
               Count(id)
        FROM   incidents_incident
        WHERE  occured_date BETWEEN '%s' AND '%s'
        ORDER  BY Field(status, 'Resolved', 'Unresolved', '(Total No. of Incidents)') 
    """ % (start_date, end_date, start_date, end_date)
    dataframe = pd.read_sql_query(sql, connection)
    dataframe = dataframe.fillna(0)
    return dataframe.to_html(index=False)


def get_police_division_summary():
    sql = """
          SELECT 
            incident.province,
            incident.di_division,
            incident.police_division,
            COUNT(incident.police_station) as police_station_count,
            COUNT(incident.id) as division_total,
            COUNT(CASE WHEN cs.current_status <> "CLOSED" THEN 1 ELSE NULL END) as open_total,
            COUNT(CASE WHEN cs.current_status = "CLOSED" THEN 1 ELSE NULL END) as closed_total
          FROM incidents_incident incident,
          ( 
            SELECT b.incident_id, b.current_status
            FROM incidents_incidentstatus b
            INNER JOIN (
              SELECT i.incident_id, max(i.created_date) cdate
              FROM incidents_incidentstatus i
              GROUP BY i.incident_id
            ) c 
            ON c.incident_id = b.incident_id AND c.cdate = b.created_date
          ) as cs 
          WHERE cs.incident_id = incident.id
          GROUP BY incident.province, incident.di_division, incident.police_division
        """
    headers = [
        "Police Stations Count",
        "Incidents Received",
        "Incidents Pending",
        "Incidents Closed",
        "Other",
        "Total Count",
        "Province Total"
    ]
    dataframe = pd.read_sql_query(sql, connection)
    dataframe.sort_values(by=['province', 'di_division'], inplace=True)
    dataframe.set_index(['province', 'di_division', 'police_division'], inplace=True)
    dataframe.fillna(value=0, inplace=True)
    dataframe["other"] = ""
    dataframe["total"] = dataframe["division_total"]
    dataframe["province_total"] = dataframe.groupby('province')['total'].transform(np.sum)

    dataframe.columns = headers
    dataframe.index.names = ["Province", "DI Division", "Police Division"]

    return dataframe.to_html()
