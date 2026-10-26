import type { FocusVesselStyle } from "../domain/focusVessel";

export interface VesselShape {
  body: string;
  inside: string;
  rim: string;
  capacityTop: number;
  capacityBottom: number;
}

export const VESSEL_SHAPES: Record<FocusVesselStyle, VesselShape> = {
  glass: {
    body: "M61 54 Q62 48 70 48 H170 Q178 48 179 54 L165 181 Q164 188 156 188 H84 Q76 188 75 181 Z",
    inside: "M63 56 Q64 51 71 51 H169 Q176 51 177 56 L163 179 Q162 185 155 185 H85 Q78 185 77 179 Z",
    rim: "M61 54 Q62 48 70 48 H170 Q178 48 179 54",
    capacityTop: 51,
    capacityBottom: 185,
  },
  coffee: {
    body: "M54 62 Q55 54 65 54 H157 Q168 54 169 63 L159 174 Q158 184 148 184 H76 Q66 184 65 174 Z",
    inside: "M57 64 Q58 58 66 58 H156 Q164 58 165 64 L155 172 Q154 180 147 180 H77 Q70 180 69 172 Z",
    rim: "M54 62 Q55 54 65 54 H157 Q168 54 169 63",
    capacityTop: 58,
    capacityBottom: 180,
  },
  mug: {
    body: "M52 59 Q52 52 61 52 H160 Q169 52 169 59 V176 Q169 185 160 185 H61 Q52 185 52 176 Z",
    inside: "M56 61 H165 V174 Q165 181 158 181 H63 Q56 181 56 174 Z",
    rim: "M52 59 Q52 52 61 52 H160 Q169 52 169 59",
    capacityTop: 61,
    capacityBottom: 181,
  },
  bottle: {
    body: "M91 50 V34 Q91 29 97 29 H143 Q149 29 149 34 V50 Q165 57 169 76 L163 177 Q162 186 153 186 H87 Q78 186 77 177 L71 76 Q75 57 91 50 Z",
    inside: "M95 52 V35 H145 V52 Q161 59 165 77 L159 175 Q158 182 152 182 H88 Q82 182 81 175 L75 77 Q79 59 95 52 Z",
    rim: "M91 50 V34 Q91 29 97 29 H143 Q149 29 149 34 V50",
    capacityTop: 51,
    capacityBottom: 182,
  },
};
