import React from 'react'

interface ElevateLogoProps {
	width?: number
	height?: number
	color?: string
	className?: string
	showText?: boolean
}

const ElevateLogo: React.FC<ElevateLogoProps> = ({
	width = 260,
	height = 34,
	color = '#96D294',
	className = '',
	showText = true,
}) => {
	// Icon dimensions - positioned at the very left edge
	const iconSize = height // Use most of the height for the icon
	const iconRadius = showText ? iconSize * 0.35 : iconSize * 0.5
	const iconX = iconRadius // Center of circle starts at radius (no left padding)
	const iconY = height / 2

	// Text positioning - centered vertically with the icon
	const textX = iconSize // Small gap between icon and text
	const textY = height / 2 + 2 // Perfectly centered vertically with icon
	const fontSize = height * 0.5 // Font size relative to height

	// Calculate the actual content width for tight fitting
	const textWidth = fontSize * 4.2 // Approximate width of "Elevate" text
	const contentWidth = showText ? textX + textWidth : iconSize // Only include text width if showing text

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${contentWidth} ${height}`}
			xmlns='http://www.w3.org/2000/svg'
			className={className}
			preserveAspectRatio='xMinYMid meet'
		>
			{/* Background circle */}
			<circle
				cx={iconX}
				cy={iconY}
				r={iconRadius}
				fill={color}
				opacity='0.2'
			/>

			{/* Upward arrow/mountain icon */}
			<path
				d={`M${iconX - iconRadius * 0.6} ${
					iconY + iconRadius * 0.5
				} L${iconX} ${iconY - iconRadius * 0.8} L${iconX + iconRadius * 0.6} ${
					iconY + iconRadius * 0.5
				} Z`}
				fill={color}
				stroke={color}
				strokeWidth='1.5'
				strokeLinejoin='round'
			/>
			<path
				d={`M${iconX - iconRadius * 0.3} ${
					iconY + iconRadius * 0.1
				} L${iconX} ${iconY - iconRadius * 0.3} L${iconX + iconRadius * 0.3} ${
					iconY + iconRadius * 0.1
				}`}
				fill='none'
				stroke='white'
				strokeWidth='1.5'
				strokeLinecap='round'
				strokeLinejoin='round'
			/>

			{/* Text: Elevate */}
			{showText && (
				<text
					x={textX}
					y={textY}
					fontFamily='Arial, sans-serif'
					fontSize={fontSize}
					fontWeight='bold'
					fill={color}
					dominantBaseline='middle'
				>
					Elevate
				</text>
			)}
		</svg>
	)
}

export default ElevateLogo
