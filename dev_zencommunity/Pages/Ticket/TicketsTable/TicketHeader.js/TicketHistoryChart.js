import React from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
    Title
} from 'chart.js';
import { __ } from '@wordpress/i18n';
import { Text } from '@chakra-ui/react';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Title);

const TicketHistoryChart = ({ data }) => {

    if (!data || data.length === 0) return <Text textAlign="center" fontSize="14px" color="gray.400">{__("No data available", "zencommunity")}</Text>;

    const labels = data.map(item => {
        const date = new Date(item.month);
        return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    });


    // Chart data
    const chartData = {
        labels: labels,
        datasets: [
            {
                label: __("Created", "zencommunity"),
                data: data.map(item => item.ticket_count),
                borderColor: '#2A3BEE',
                backgroundColor: '#2A3BEE',
                tension: 0.3,
            },
            {
                label: __("Pending", "zencommunity"),
                data: data.map(item => item.pending_count),
                borderColor: '#EA580C',
                backgroundColor: '#EA580C',
                tension: 0.3,
            },
            {
                label: __("Closed", "zencommunity"),
                data: data.map(item => item.closed_count),
                borderColor: '#22A06B',
                backgroundColor: '#22A06B',
                tension: 0.3,
            },
        ]
    };

    // Chart configuration
    const config = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                min: 0,
                max: 5000,
                ticks: {
                    stepSize: 1000,
                },
            },
            x: {
                title: {
                    display: false,
                },
            },
        },
    };
    return <Line data={chartData} options={config} />;
};

export default TicketHistoryChart; 