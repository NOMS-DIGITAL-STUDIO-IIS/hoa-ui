CREATE INDEX HPA_PRISONER_NAME_AGE_SEARCH
    ON HPA.PRISONERS
    (
        SURNAME,
        FORENAME_1,
        FORENAME_2,
        BIRTH_DATE,
        HAS_HDC,
        SEX,
        IS_LIFER,
        IS_ALIAS,
        PRIMARY_SURNAME,
        PRIMARY_INITIAL,
        RECEPTION_DATE DESC
    ) INCLUDE (
    PRISON_NUMBER,
    PNC_NUMBER,
    CRO_NUMBER,
    PERSON_IDENTIFIER,
    PRIMARY_FORENAME_1,
    PRIMARY_FORENAME_2,
    PRIMARY_BIRTH_DATE
)
    WITH (ONLINE = ON);
GO




CREATE INDEX HPA_PRISONER_PNC_SEARCH
    ON HPA.PRISONERS
    (
        PNC_NUMBER,
        HAS_HDC,
        SEX,
        IS_LIFER,
        IS_ALIAS,
        PRIMARY_SURNAME,
        PRIMARY_INITIAL,
        BIRTH_DATE,
        RECEPTION_DATE DESC
    ) INCLUDE (
    PRISON_NUMBER,
    CRO_NUMBER,
    SURNAME,
    FORENAME_1,
    FORENAME_2,
    PERSON_IDENTIFIER,
    PRIMARY_FORENAME_1,
    PRIMARY_FORENAME_2,
    PRIMARY_BIRTH_DATE
)
    WITH (ONLINE = ON);
GO

CREATE INDEX HPA_PRISONER_CRO_SEARCH
    ON HPA.PRISONERS
    (
        CRO_NUMBER,
        HAS_HDC,
        SEX,
        IS_LIFER,
        IS_ALIAS,
        PRIMARY_SURNAME,
        PRIMARY_INITIAL,
        BIRTH_DATE,
        RECEPTION_DATE DESC
    ) INCLUDE (
    PRISON_NUMBER,
    PNC_NUMBER,
    SURNAME,
    FORENAME_1,
    FORENAME_2,
    PERSON_IDENTIFIER,
    PRIMARY_FORENAME_1,
    PRIMARY_FORENAME_2,
    PRIMARY_BIRTH_DATE
)
    WITH (ONLINE = ON);
GO


CREATE INDEX HPA_PRISONER_NUMBER_SEARCH
    ON HPA.PRISONERS
    (
        PRISON_NUMBER,
        HAS_HDC,
        SEX,
        IS_LIFER,
        IS_ALIAS,
        PRIMARY_SURNAME,
        PRIMARY_INITIAL,
        BIRTH_DATE,
        RECEPTION_DATE DESC
    ) INCLUDE (
    CRO_NUMBER,
    PNC_NUMBER,
    SURNAME,
    FORENAME_1,
    FORENAME_2,
    PERSON_IDENTIFIER,
    PRIMARY_FORENAME_1,
    PRIMARY_FORENAME_2,
    PRIMARY_BIRTH_DATE
)
    WITH (ONLINE = ON);
GO

