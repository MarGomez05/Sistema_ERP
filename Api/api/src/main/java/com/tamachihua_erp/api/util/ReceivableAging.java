package com.tamachihua_erp.api.util;

import java.util.List;

// Tramos de antigüedad de las cuentas por cobrar.
public final class ReceivableAging {

    public static final String CURRENT = "CURRENT";
    public static final String D1_30 = "D1_30";
    public static final String D31_60 = "D31_60";
    public static final String D61_90 = "D61_90";
    public static final String D90_PLUS = "D90_PLUS";

    private static final List<String> BUCKETS = List.of(
            CURRENT,
            D1_30,
            D31_60,
            D61_90,
            D90_PLUS
    );

    private ReceivableAging() {
    }

    public static List<String> buckets() {

        return BUCKETS;
    }

    public static String bucket(long daysOverdue) {

        if (daysOverdue <= 0) {
            return CURRENT;
        }

        if (daysOverdue <= 30) {
            return D1_30;
        }

        if (daysOverdue <= 60) {
            return D31_60;
        }

        if (daysOverdue <= 90) {
            return D61_90;
        }

        return D90_PLUS;
    }

    public static String label(String bucket) {

        return switch (bucket) {
            case CURRENT -> "Al día";
            case D1_30 -> "1 a 30 días";
            case D31_60 -> "31 a 60 días";
            case D61_90 -> "61 a 90 días";
            case D90_PLUS -> "Más de 90 días";
            default -> bucket;
        };
    }
}
