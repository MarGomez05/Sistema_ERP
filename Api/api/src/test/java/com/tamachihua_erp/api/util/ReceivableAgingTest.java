package com.tamachihua_erp.api.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReceivableAgingTest {

    @Test
    void clasificaLaDeudaPorAntiguedad() {

        assertThat(ReceivableAging.bucket(0)).isEqualTo(ReceivableAging.CURRENT);
        assertThat(ReceivableAging.bucket(-5)).isEqualTo(ReceivableAging.CURRENT);
        assertThat(ReceivableAging.bucket(1)).isEqualTo(ReceivableAging.D1_30);
        assertThat(ReceivableAging.bucket(30)).isEqualTo(ReceivableAging.D1_30);
        assertThat(ReceivableAging.bucket(31)).isEqualTo(ReceivableAging.D31_60);
        assertThat(ReceivableAging.bucket(60)).isEqualTo(ReceivableAging.D31_60);
        assertThat(ReceivableAging.bucket(61)).isEqualTo(ReceivableAging.D61_90);
        assertThat(ReceivableAging.bucket(90)).isEqualTo(ReceivableAging.D61_90);
        assertThat(ReceivableAging.bucket(91)).isEqualTo(ReceivableAging.D90_PLUS);
    }

    @Test
    void exponeLosTramosEnOrdenConEtiquetas() {

        assertThat(ReceivableAging.buckets()).containsExactly(
                ReceivableAging.CURRENT,
                ReceivableAging.D1_30,
                ReceivableAging.D31_60,
                ReceivableAging.D61_90,
                ReceivableAging.D90_PLUS
        );

        assertThat(ReceivableAging.label(ReceivableAging.CURRENT)).isEqualTo("Al día");
        assertThat(ReceivableAging.label(ReceivableAging.D1_30)).isEqualTo("1 a 30 días");
        assertThat(ReceivableAging.label(ReceivableAging.D90_PLUS))
                .isEqualTo("Más de 90 días");
    }
}
