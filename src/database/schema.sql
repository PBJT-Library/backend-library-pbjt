SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public;
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: books; Type: TABLE; Schema: public;
--

CREATE TABLE public.books (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    id character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    category character varying(100) NOT NULL,
    author character varying(100) NOT NULL,
    publisher character varying(100) NOT NULL,
    year integer NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    CONSTRAINT books_stock_check CHECK ((stock >= 0))
);


--
-- Name: loan_code_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.loan_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loan_id_seq; Type: SEQUENCE; Schema: public;
--

CREATE SEQUENCE public.loan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: loans; Type: TABLE; Schema: public;
--

CREATE TABLE public.loans (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    id character varying(20) DEFAULT ('LN'::text || lpad((nextval('public.loan_id_seq'::regclass))::text, 3, '0'::text)),
    book_uuid uuid NOT NULL,
    member_uuid uuid NOT NULL,
    quantity integer NOT NULL,
    loan_date date DEFAULT CURRENT_DATE NOT NULL,
    return_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT loans_quantity_check CHECK ((quantity > 0))
);


--
-- Name: members; Type: TABLE; Schema: public;
--

CREATE TABLE public.members (
    uuid uuid DEFAULT gen_random_uuid() NOT NULL,
    id character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    study_program character varying(100) NOT NULL,
    semester integer NOT NULL,
    CONSTRAINT members_semester_check CHECK (((semester >= 1) AND (semester <= 14)))
);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: books books_id_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_id_key UNIQUE (id);


--
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (uuid);


--
-- Name: loans loans_id_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_id_key UNIQUE (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (uuid);


--
-- Name: members members_id_key; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_id_key UNIQUE (id);


--
-- Name: members members_pkey; Type: CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.members
    ADD CONSTRAINT members_pkey PRIMARY KEY (uuid);


--
-- Name: idx_loans_book_uuid; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_book_uuid ON public.loans USING btree (book_uuid);


--
-- Name: idx_loans_id; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_id ON public.loans USING btree (id);


--
-- Name: idx_loans_loan_date; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_loan_date ON public.loans USING btree (loan_date);


--
-- Name: idx_loans_member_uuid; Type: INDEX; Schema: public;
--

CREATE INDEX idx_loans_member_uuid ON public.loans USING btree (member_uuid);


--
-- Name: loans loans_book_uuid_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_book_uuid_fkey FOREIGN KEY (book_uuid) REFERENCES public.books(uuid) ON DELETE RESTRICT;


--
-- Name: loans loans_member_uuid_fkey; Type: FK CONSTRAINT; Schema: public;
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_member_uuid_fkey FOREIGN KEY (member_uuid) REFERENCES public.members(uuid) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--