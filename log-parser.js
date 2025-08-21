import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { createReadStream } from 'fs';

const incidentsLogPath = path.join(process.cwd(), 'data', 'incidents.log');

/**
 * Analyzes the incidents.log file to extract statistics.
 * @returns {Promise<{incidents24h: number, topRules: object}>}
 */
export async function getStatsFromLogs() {
    const stats = {
        incidents24h: 0,
        topRules: {
            flood: 0,
            caps: 0,
            repeat: 0,
            link: 0,
        },
    };

    try {
        // Ensure file exists before trying to read
        await fs.access(incidentsLogPath);

        const fileStream = createReadStream(incidentsLogPath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));

        for await (const line of rl) {
            try {
                const incident = JSON.parse(line);
                const incidentDate = new Date(incident.timestamp);

                if (incidentDate > twentyFourHoursAgo) {
                    stats.incidents24h++;
                    if (incident.type === 'spam_detected' && incident.meta?.reason) {
                        const reason = incident.meta.reason;
                        if (stats.topRules.hasOwnProperty(reason)) {
                            stats.topRules[reason]++;
                        }
                    }
                }
            } catch (e) {
                // Ignore malformed lines
            }
        }
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading incidents log:', error);
        }
        // If file doesn't exist or other error, return default stats
    }

    return stats;
}
