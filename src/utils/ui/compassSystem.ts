import { boat } from "../../main";
import { CheckpointSystem } from "../progression/checkpointSystem";

const DIRECTION_MAPPINGS = [
  { angle: 0, direction: "N" },
  { angle: 45, direction: "NE" },
  { angle: 90, direction: "E" },
  { angle: 135, direction: "SE" },
  { angle: 180, direction: "S" },
  { angle: -135, direction: "SW" },
  { angle: -90, direction: "W" },
  { angle: -45, direction: "NW" },
];

function getCompassDirection(rotation: number): {
  direction: string;
  angle: number;
} {
  let degrees = ((rotation * 180) / Math.PI) % 360;
  if (degrees > 180) degrees -= 360;
  if (degrees < -180) degrees += 360;

  let displayAngle = degrees;
  if (displayAngle < 0) displayAngle += 360;

  let closest = DIRECTION_MAPPINGS[0];
  let closestDiff = Math.abs(degrees - closest.angle);

  for (const mapping of DIRECTION_MAPPINGS) {
    const diff = Math.abs(degrees - mapping.angle);
    if (diff < closestDiff) {
      closest = mapping;
      closestDiff = diff;
    }
  }

  return {
    direction: closest.direction,
    angle: Math.round(displayAngle),
  };
}

function createCompassMarkings(): string {
  let markings = "";
  for (let i = -180; i <= 540; i += 15) {
    const isMajor = i % 90 === 0;
    const isMinor = i % 45 === 0;

    let label = "";
    const normalizedAngle = ((i % 360) + 360) % 360;

    if (isMajor) {
      label = ["N", "E", "S", "W"][Math.floor(normalizedAngle / 90)];
    } else if (isMinor) {
      label =
        DIRECTION_MAPPINGS.find((m) => m.angle === normalizedAngle)
          ?.direction || "";
    }

    markings += `
      <div class="compass-marking ${
        isMajor ? "major" : isMinor ? "minor" : ""
      }" 
           style="left: ${i * 3}px">
        ${isMajor || isMinor ? `<div class="marking-label">${label}</div>` : ""}
        ${
          isMajor
            ? '<div class="marking-line major"></div>'
            : isMinor
            ? '<div class="marking-line minor"></div>'
            : '<div class="marking-line"></div>'
        }
      </div>`;
  }
  return markings;
}

export function updateCompass(checkpointSystem?: CheckpointSystem) {
  if (!boat) return;

  const adjustedRotation = boat.rotation.y - Math.PI + Math.PI / 2;
  const { angle } = getCompassDirection(adjustedRotation);

  if (checkpointSystem && boat) {
    const currentCheckpoint = checkpointSystem.getCurrentCheckpoint();
    if (currentCheckpoint) {
      const directionToCheckpoint =
        Math.atan2(
          -(currentCheckpoint.x - boat.position.x),
          currentCheckpoint.z - boat.position.z
        ) *
        (180 / Math.PI);

      const compassDirection = (-directionToCheckpoint + 270) % 360;

      const pointer = document.querySelector(
        ".checkpoint-pointer"
      ) as HTMLElement;
      if (pointer) {
        pointer.style.left = `${compassDirection * 3}px`;

        const timeRemaining = checkpointSystem.getRemainingTime();
        pointer.style.borderBottomColor =
          timeRemaining <= 10 ? "#ff0000" : "#00ff00";

        const compassStrip = document.querySelector(".compass-strip");
        if (pointer.parentElement !== compassStrip) {
          compassStrip?.appendChild(pointer);
        }
      }
    }
  }

  const compassStrip = document.querySelector(".compass-strip") as HTMLElement;
  if (compassStrip) {
    compassStrip.style.transform = `translateX(${-angle * 3 + 400}px)`;
  }
}

function initCompass() {
  const compassStrip = document.querySelector(".compass-strip");
  if (compassStrip) {
    compassStrip.innerHTML = createCompassMarkings();

    const pointer = document.createElement("div");
    pointer.className = "checkpoint-pointer";
    compassStrip.appendChild(pointer);
  }
}

initCompass();
