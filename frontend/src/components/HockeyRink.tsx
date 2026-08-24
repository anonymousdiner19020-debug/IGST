import React, { useRef } from "react";
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop } from "react-native-svg";

type Props = {
  w: number;
  h: number;
  netTop: number;
  goalY: number;
  netL: number;
  netR: number;
};

// Perspective ice-rink scene drawn from the shooter's point of view.
export function HockeyRink({ w, h, netTop, goalY, netL, netR }: Props) {
  const uid = useRef(`rink_${Math.random().toString(36).slice(2, 8)}`).current;
  const ice = `${uid}_ice`;
  const stands = `${uid}_st`;

  // Ice trapezoid: narrow near the net (top), wide near the shooter (bottom).
  const iceTopL = w * 0.14;
  const iceTopR = w * 0.86;
  // Crease (blue) sits just in front of the goal mouth.
  const creaseTopL = (netL + iceTopL) / 2 + 6;
  const creaseTopR = (netR + iceTopR) / 2 - 6;
  const creaseBotY = goalY + (h - goalY) * 0.26;
  const creaseBotL = w * 0.30;
  const creaseBotR = w * 0.70;

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <LinearGradient id={ice} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#BFE0F5" />
          <Stop offset="0.35" stopColor="#DCEEFB" />
          <Stop offset="1" stopColor="#FFFFFF" />
        </LinearGradient>
        <LinearGradient id={stands} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1B2733" />
          <Stop offset="1" stopColor="#33475B" />
        </LinearGradient>
      </Defs>

      {/* arena stands / back wall */}
      <Rect x={0} y={0} width={w} height={netTop + 6} fill={`url(#${stands})`} />
      {/* crowd speckle */}
      {Array.from({ length: 46 }).map((_, i) => (
        <Circle
          key={i}
          cx={(i * 37) % w}
          cy={6 + ((i * 13) % (netTop - 4))}
          r={1.6}
          fill={["#E8A", "#8BD", "#EDD", "#C9C", "#AEA"][i % 5]}
          opacity={0.6}
        />
      ))}
      {/* dasher boards (white) with ad strip */}
      <Rect x={0} y={netTop} width={w} height={10} fill="#F4F6F8" />
      <Rect x={0} y={netTop + 3} width={w} height={4} fill="#C8102E" opacity={0.85} />

      {/* ice surface (perspective trapezoid) */}
      <Path d={`M0 ${h} L${w} ${h} L${iceTopR} ${netTop + 10} L${iceTopL} ${netTop + 10} Z`} fill={`url(#${ice})`} />

      {/* side boards (perspective) */}
      <Path d={`M0 ${h} L${iceTopL} ${netTop + 10} L${iceTopL - 6} ${netTop + 10} L-8 ${h} Z`} fill="#E7ECF1" />
      <Path d={`M${w} ${h} L${iceTopR} ${netTop + 10} L${iceTopR + 6} ${netTop + 10} L${w + 8} ${h} Z`} fill="#E7ECF1" />

      {/* perspective blue & red lines across the ice */}
      {[
        { t: 0.30, c: "#1E5FD0", sw: 5 },
        { t: 0.52, c: "#C8102E", sw: 4 },
        { t: 0.74, c: "#1E5FD0", sw: 6 },
      ].map((ln, i) => {
        const y = netTop + 10 + (h - netTop - 10) * ln.t;
        const lx = iceTopL + (0 - iceTopL) * ln.t;
        const rx = iceTopR + (w - iceTopR) * ln.t;
        return <Line key={i} x1={lx} y1={y} x2={rx} y2={y} stroke={ln.c} strokeWidth={ln.sw} opacity={0.55} />;
      })}

      {/* faceoff dots */}
      {[
        { x: 0.32, t: 0.6 },
        { x: 0.68, t: 0.6 },
      ].map((d, i) => {
        const y = netTop + 10 + (h - netTop - 10) * d.t;
        return <Circle key={i} cx={w * d.x} cy={y} r={6} fill="#C8102E" opacity={0.5} />;
      })}

      {/* goal crease (blue) */}
      <Path
        d={`M${creaseTopL} ${goalY} L${creaseTopR} ${goalY} L${creaseBotR} ${creaseBotY} L${creaseBotL} ${creaseBotY} Z`}
        fill="#7FB6E8"
        opacity={0.55}
        stroke="#1E5FD0"
        strokeWidth={2}
      />

      {/* 3D goal net behind the crease */}
      <G>
        {/* back mesh panel (receding up-inward) */}
        <Path
          d={`M${netL + 14} ${netTop + 20} L${netR - 14} ${netTop + 20} L${netR - 8} ${goalY - 14} L${netL + 8} ${goalY - 14} Z`}
          fill="#F2F5F8"
          opacity={0.9}
        />
        {/* mesh lines */}
        {Array.from({ length: 6 }).map((_, i) => {
          const yy = netTop + 22 + i * ((goalY - 40 - netTop) / 6);
          return <Line key={`h${i}`} x1={netL + 10} y1={yy} x2={netR - 10} y2={yy} stroke="#B9C4CE" strokeWidth={0.8} />;
        })}
        {Array.from({ length: 7 }).map((_, i) => {
          const xx = netL + 12 + i * ((netR - netL - 24) / 6);
          return <Line key={`v${i}`} x1={xx} y1={netTop + 22} x2={xx} y2={goalY - 16} stroke="#B9C4CE" strokeWidth={0.8} />;
        })}
        {/* depth struts front->back */}
        <Line x1={netL} y1={goalY} x2={netL + 8} y2={goalY - 14} stroke="#C8102E" strokeWidth={3} />
        <Line x1={netR} y1={goalY} x2={netR - 8} y2={goalY - 14} stroke="#C8102E" strokeWidth={3} />
        <Line x1={netL} y1={netTop + 22} x2={netL + 14} y2={netTop + 20} stroke="#C8102E" strokeWidth={3} />
        <Line x1={netR} y1={netTop + 22} x2={netR - 14} y2={netTop + 20} stroke="#C8102E" strokeWidth={3} />
        {/* front frame (red pipes) */}
        <Line x1={netL} y1={netTop + 22} x2={netL} y2={goalY} stroke="#E11029" strokeWidth={6} strokeLinecap="round" />
        <Line x1={netR} y1={netTop + 22} x2={netR} y2={goalY} stroke="#E11029" strokeWidth={6} strokeLinecap="round" />
        <Line x1={netL} y1={netTop + 22} x2={netR} y2={netTop + 22} stroke="#E11029" strokeWidth={6} strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export default HockeyRink;
